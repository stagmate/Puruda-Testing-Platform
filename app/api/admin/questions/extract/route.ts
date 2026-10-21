// Reads a few rendered PDF pages with OpenAI (vision) and returns structured
// questions: text, options, type, answers, solutions and where each diagram is.
// The browser renders the pages, calls this in batches, merges the results and
// crops the diagrams itself.

// Long enough for a slow batch. Vercel caps this per plan (300 s on Hobby with
// fluid compute); the browser retries a batch that fails.
export const maxDuration = 300

import { NextResponse } from "next/server"
import OpenAI from "openai"
import { requireRole, STAFF } from "@/lib/api-auth"
import { sanitizeExtraction, pixelBoxesToNormalized, type PageSize } from "@/lib/pdf-import/extraction"

const MODEL = process.env.OPENAI_MODEL || "gpt-5.5"
// Optional: only sent when set, since not every model accepts it.
const REASONING = (["minimal", "low", "medium", "high"] as const).find(e => e === process.env.OPENAI_REASONING_EFFORT)
const MAX_PAGES_PER_CALL = 6
const MAX_IMAGE_CHARS = 3_000_000 // ~2.2 MB per page image as base64

// ---- Output schema (structured outputs: every object closed, every field required) ----
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] })
const BOX = {
    type: "object",
    description: "Box on that page in thousandths of the page width (x) and height (y): (x1, y1) top-left, (x2, y2) bottom-right, each 0-1000",
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

// Stable instructions come first so OpenAI can cache them across batches.
const SYSTEM = `You transcribe exam question papers into structured data. You receive images of printed pages; each is preceded by its page number.

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

Picture locations: "page" is the page the picture is on and "box" is measured in thousandths of that page: x from 0 (left edge) to 1000 (right edge), y from 0 (top edge) to 1000 (bottom edge). x1,y1 is the top-left corner of the picture and x2,y2 its bottom-right. Box just the picture with its own labels, axis titles and legend, not the surrounding question text. Be generous rather than cutting off part of a picture.

answers: one entry per answer-key or worked-solution entry on the pages you are asked about: the question number, the answer exactly as printed (e.g. "B", "A, C", "12"), and the solution text if one is given (same formatting), else null.

Ignore running headers, footers and page numbers.`

function task(from: number, to: number, sent: number[]) {
    const range = from === to ? `page ${from}` : `pages ${from}–${to}`
    const context = sent.filter(p => p < from || p > to)
    return `Extract every question that starts on ${range}, and every answer-key entry and worked solution printed on ${range}.` +
        (context.length ? ` Pages ${context.join(", ")} are context only: use them to finish a question that continues across a page break, but do not extract questions that start on them.` : "")
}

let client: OpenAI | null = null // created on first use (reads OPENAI_API_KEY)

type PageIn = { page: number; image: string; width: number; height: number }

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "AI is not configured. Set OPENAI_API_KEY on the server." }, { status: 503 })
    }
    client ??= new OpenAI()

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

    const content: OpenAI.Chat.ChatCompletionContentPart[] = []
    const sent: number[] = []
    for (const p of pages) {
        const ok = typeof p?.image === "string" && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image)
        if (!ok || p.image.length > MAX_IMAGE_CHARS || !Number.isInteger(p.page)) {
            return NextResponse.json({ error: `Page ${p?.page ?? "?"} is not a valid image` }, { status: 400 })
        }
        sent.push(p.page)
        content.push(
            { type: "text", text: `Page ${p.page}:` },
            { type: "image_url", image_url: { url: p.image, detail: "high" } },
        )
    }
    content.push({ type: "text", text: task(from, to, sent) })

    try {
        const completion = await client.chat.completions.create({
            model: MODEL,
            max_completion_tokens: 32000,
            messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content },
            ],
            response_format: { type: "json_schema", json_schema: { name: "question_paper", strict: true, schema: SCHEMA } },
            ...(REASONING ? { reasoning_effort: REASONING } : {}),
        })

        const choice = completion.choices[0]
        if (choice?.message?.refusal) {
            console.error("[PDF_EXTRACT] refusal", choice.message.refusal)
            return NextResponse.json({ error: `The AI declined to read pages ${from}–${to}. Add those questions by hand.` }, { status: 422 })
        }
        if (choice?.finish_reason === "length") {
            return NextResponse.json({ error: `Pages ${from}–${to} have too much text to read at once.` }, { status: 422 })
        }

        let parsed: unknown
        try {
            parsed = JSON.parse(choice?.message?.content ?? "")
        } catch {
            console.error("[PDF_EXTRACT] unparseable output", (choice?.message?.content ?? "").slice(0, 500))
            return NextResponse.json({ error: "The AI's answer was incomplete. Retrying may help." }, { status: 502 })
        }
        // Boxes come back in thousandths of each page; reuse the pixel converter with a 1000×1000 "page".
        const perMille: PageSize[] = sent.map(page => ({ page, width: 1000, height: 1000 }))
        return NextResponse.json(sanitizeExtraction(pixelBoxesToNormalized(parsed, perMille), sent))
    } catch (error) {
        const { status, message } = describeError(error)
        return NextResponse.json({ error: message }, { status })
    }
}

/**
 * Turn an API failure into a message an admin can act on. 503 means "every page
 * will fail the same way" and stops the import; 429/502 are retried by the browser.
 * OpenAI's own message is included where it helps (this route is staff-only).
 */
function describeError(error: unknown): { status: number; message: string } {
    if (error instanceof OpenAI.APIError) console.error("[PDF_EXTRACT]", error.status, error.code, error.message)
    else console.error("[PDF_EXTRACT]", error)

    const detail = (error instanceof Error ? error.message.replace(/^\d{3}\s*/, "") : "").slice(0, 300)

    // APIConnectionError is a subclass of APIError, so check it first.
    if (error instanceof OpenAI.APIConnectionError) {
        return { status: 502, message: "Couldn't reach the AI service." }
    }
    if (error instanceof OpenAI.RateLimitError) {
        if (error.code === "insufficient_quota") {
            return { status: 503, message: "Your OpenAI account has no credit left. Add credit at platform.openai.com → Billing, then try again." }
        }
        return { status: 429, message: "The AI service is busy. Try again in a minute." }
    }
    if (error instanceof OpenAI.AuthenticationError) {
        return { status: 503, message: "The OpenAI API key on the server is invalid. Check OPENAI_API_KEY in Vercel." }
    }
    if (error instanceof OpenAI.PermissionDeniedError) {
        return { status: 503, message: `The OpenAI API key isn't allowed to do this: ${detail}` }
    }
    if (error instanceof OpenAI.NotFoundError) {
        return { status: 503, message: `Model "${MODEL}" isn't available on this OpenAI key. Set OPENAI_MODEL in Vercel to a model your account can use. (${detail})` }
    }
    if (error instanceof OpenAI.BadRequestError) {
        return { status: 503, message: `OpenAI rejected the request: ${detail}` }
    }
    if (error instanceof OpenAI.APIError) {
        const status = error.status ?? 500
        return { status: status >= 500 ? 502 : 500, message: `OpenAI returned an error (${status}): ${detail}` }
    }
    return { status: 500, message: `The AI couldn't read these pages: ${detail || "unknown error"}` }
}
