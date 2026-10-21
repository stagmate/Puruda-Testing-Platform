// Reads a few rendered PDF pages with Claude (vision) and returns structured
// questions: text, options, type, answers, solutions and where each diagram is.
// The browser renders the pages, calls this in batches, merges the results and
// crops the diagrams itself.

// Long enough for a slow batch. Vercel caps this per plan (300 s on Hobby with
// fluid compute); the browser retries a batch that fails.
export const maxDuration = 300

import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireRole, STAFF } from "@/lib/api-auth"
import { sanitizeExtraction, pixelBoxesToNormalized, type PageSize } from "@/lib/pdf-import/extraction"

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5"
const EFFORT = (["low", "medium", "high"] as const).find(e => e === process.env.ANTHROPIC_EFFORT) ?? "medium"
const MAX_PAGES_PER_CALL = 6
const MAX_IMAGE_CHARS = 3_000_000 // ~2.2 MB per page image as base64
const MAX_PAGE_PX = 2576           // Claude sees images up to this long edge without resizing

// ---- Output schema (structured outputs: every object closed, every field required) ----
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] })
const BOX = {
    type: "object",
    description: "Pixel box on that page image: (x1, y1) top-left, (x2, y2) bottom-right",
    properties: { x1: { type: "integer" }, y1: { type: "integer" }, x2: { type: "integer" }, y2: { type: "integer" } },
    required: ["x1", "y1", "x2", "y2"],
    additionalProperties: false,
}
const FIGURE = {
    type: "object",
    properties: { page: { type: "integer" }, box: BOX },
    required: ["page", "box"],
    additionalProperties: false,
}
const SCHEMA = {
    type: "object",
    properties: {
        questions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    number: { type: "string" },
                    page: { type: "integer" },
                    section: nullable({ type: "string" }),
                    text: { type: "string" },
                    type: { type: "string", enum: ["SINGLE", "MULTIPLE", "INTEGER"] },
                    options: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: { label: { type: "string" }, text: { type: "string" }, figure: nullable(FIGURE) },
                            required: ["label", "text", "figure"],
                            additionalProperties: false,
                        },
                    },
                    figures: { type: "array", items: FIGURE },
                    answer: nullable({ type: "string" }),
                    solution: nullable({ type: "string" }),
                },
                required: ["number", "page", "section", "text", "type", "options", "figures", "answer", "solution"],
                additionalProperties: false,
            },
        },
        answers: {
            type: "array",
            items: {
                type: "object",
                properties: { number: { type: "string" }, answer: nullable({ type: "string" }), solution: nullable({ type: "string" }) },
                required: ["number", "answer", "solution"],
                additionalProperties: false,
            },
        },
    },
    required: ["questions", "answers"],
    additionalProperties: false,
}

// Stable instructions live in the system prompt so they can be cached across batches.
const SYSTEM = `You transcribe exam question papers into structured data. You receive images of printed pages; each is preceded by its page number and pixel size.

For each question:
- number: the printed question number, e.g. "17".
- page: the page the question starts on.
- text: the question stem exactly as printed, without the number and without the options.
- options: in printed order, label as printed (A, B, C, D) and the option text. If an option is, or contains, a picture, give its location in "figure" and keep any printed text; otherwise "figure" is null.
- figures: the location of every diagram, graph, chart, structure or table image that belongs to the question stem. Do not describe pictures in words.
- If one picture holds several labelled panels that the options refer to (e.g. curves A–D), put the whole picture in the question's figures, not in the options.
- type: "INTEGER" if the question has no options and expects a numeric answer; "MULTIPLE" if the paper says one or more options may be correct, or its answer has more than one option; otherwise "SINGLE".
- answer and solution: only if printed right next to the question; otherwise null.
- section: the section heading the question sits under, or null.

Text formatting (question text, options and solutions):
- Subscripts as _{...} and superscripts as ^{...}: H_{2}O, 1.93 × 10^{5}, Cu^{2+}, SO_{4}^{2−}, E°_{cell}, Λ°_{m}, K_{sp}.
- Use Unicode for symbols: × → ⇌ ° Λ κ √ − ≈ ≤ ≥ Δ. Never use LaTeX commands or $ signs.
- Keep numbers, units and signs exactly as printed. Transcribe; never solve or correct a question.

Picture locations: "page" is the page the picture is on and "box" is in that page image's pixels, x1,y1 at the top-left corner of the picture and x2,y2 at its bottom-right. Box just the picture with its own labels, axis titles and legend, not the surrounding question text.

answers: one entry per answer-key or worked-solution entry on the pages you are asked about: the question number, the answer exactly as printed (e.g. "B", "A, C", "12"), and the solution text if one is given (same formatting), else null.

Ignore running headers, footers and page numbers.`

function task(from: number, to: number, sent: number[]) {
    const range = from === to ? `page ${from}` : `pages ${from}–${to}`
    const context = sent.filter(p => p < from || p > to)
    return `Extract every question that starts on ${range}, and every answer-key entry and worked solution printed on ${range}.` +
        (context.length ? ` Pages ${context.join(", ")} are context only: use them to finish a question that continues across a page break, but do not extract questions that start on them.` : "")
}

const client = new Anthropic() // reads ANTHROPIC_API_KEY

type PageIn = { page: number; image: string; width: number; height: number }

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY on the server." }, { status: 503 })
    }

    let body: { pages?: PageIn[]; from?: number; to?: number }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const pages = Array.isArray(body.pages) ? body.pages : []
    const from = Number(body.from)
    const to = Number(body.to)
    if (pages.length === 0 || pages.length > MAX_PAGES_PER_CALL || !Number.isInteger(from) || !Number.isInteger(to) || from > to) {
        return NextResponse.json({ error: `Send 1–${MAX_PAGES_PER_CALL} pages and a valid page range` }, { status: 400 })
    }

    const content: Anthropic.Beta.BetaContentBlockParam[] = []
    const sizes: PageSize[] = []
    for (const p of pages) {
        const m = typeof p?.image === "string" && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(p.image)
        const okSize = [p?.width, p?.height].every(v => Number.isInteger(v) && v > 0 && v <= MAX_PAGE_PX)
        if (!m || p.image.length > MAX_IMAGE_CHARS || !Number.isInteger(p.page) || !okSize) {
            return NextResponse.json({ error: `Page ${p?.page ?? "?"} is not a valid image` }, { status: 400 })
        }
        sizes.push({ page: p.page, width: p.width, height: p.height })
        content.push(
            { type: "text", text: `Page ${p.page} (${p.width}×${p.height} px):` },
            { type: "image", source: { type: "base64", media_type: m[1] as "image/jpeg" | "image/png" | "image/webp", data: m[2] } },
        )
    }
    content.push({ type: "text", text: task(from, to, sizes.map(s => s.page)) })

    try {
        // Streaming keeps a long response from hitting HTTP timeouts.
        const stream = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 32000,
            system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content }],
            output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
            // If a safety filter declines (chemistry/biology can trip it), retry on the
            // model Anthropic recommends for that case instead of failing.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
        })
        const message = await stream.finalMessage()

        if (message.stop_reason === "refusal") {
            console.error("[PDF_EXTRACT] refusal", message.stop_details)
            return NextResponse.json({ error: `The AI declined to read pages ${from}–${to}. Add those questions by hand.` }, { status: 422 })
        }
        if (message.stop_reason === "max_tokens") {
            return NextResponse.json({ error: `Pages ${from}–${to} have too much text to read at once.` }, { status: 422 })
        }

        const text = message.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("")
        const json = pixelBoxesToNormalized(JSON.parse(text), sizes)
        return NextResponse.json(sanitizeExtraction(json, sizes.map(s => s.page)))
    } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
            return NextResponse.json({ error: "The AI service is busy. Try again in a minute." }, { status: 429 })
        }
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
            console.error("[PDF_EXTRACT] auth", error.message)
            return NextResponse.json({ error: "The AI key on the server is invalid. Check ANTHROPIC_API_KEY." }, { status: 503 })
        }
        // APIConnectionError is a subclass of APIError, so check it first.
        if (error instanceof Anthropic.APIConnectionError) {
            return NextResponse.json({ error: "Couldn't reach the AI service." }, { status: 502 })
        }
        if (error instanceof Anthropic.APIError) {
            console.error("[PDF_EXTRACT]", error.status, error.message)
            // 5xx / overloaded: the browser retries these
            return NextResponse.json({ error: "The AI couldn't read these pages." }, { status: (error.status ?? 500) >= 500 ? 502 : 500 })
        }
        console.error("[PDF_EXTRACT]", error)
        return NextResponse.json({ error: "The AI couldn't read these pages." }, { status: 500 })
    }
}
