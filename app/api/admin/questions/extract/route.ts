// Reads a few rendered PDF pages with Gemini (vision) and returns structured
// questions: text, options, type, answers, solutions and the location of any
// diagrams. The browser renders the pages, calls this in batches, merges the
// results and crops the diagrams itself.

export const maxDuration = 60

import { NextResponse } from "next/server"
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai"
import { requireRole, STAFF } from "@/lib/api-auth"
import { getAllKeys } from "@/lib/gemini-keys"
import { sanitizeExtraction } from "@/lib/pdf-import/extraction"

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"
const MAX_PAGES_PER_CALL = 8
const MAX_IMAGE_CHARS = 2_000_000 // ~1.5 MB per page image as base64

const FIGURE: ResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        page: { type: SchemaType.INTEGER, description: "Page number the picture is on" },
        box: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.INTEGER },
            description: "[ymin, xmin, ymax, xmax] of the picture, normalised 0-1000 for that page",
        },
    },
    required: ["page", "box"],
}

const SCHEMA: ResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        questions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    number: { type: SchemaType.STRING },
                    page: { type: SchemaType.INTEGER },
                    section: { type: SchemaType.STRING, nullable: true },
                    text: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING, format: "enum", enum: ["SINGLE", "MULTIPLE", "INTEGER"] },
                    options: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                label: { type: SchemaType.STRING },
                                text: { type: SchemaType.STRING },
                                figure: { ...FIGURE, nullable: true },
                            },
                            required: ["label", "text"],
                        },
                    },
                    figures: { type: SchemaType.ARRAY, items: FIGURE },
                    answer: { type: SchemaType.STRING, nullable: true },
                    solution: { type: SchemaType.STRING, nullable: true },
                },
                required: ["number", "page", "text", "type", "options", "figures"],
            },
        },
        answers: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    number: { type: SchemaType.STRING },
                    answer: { type: SchemaType.STRING, nullable: true },
                    solution: { type: SchemaType.STRING, nullable: true },
                },
                required: ["number"],
            },
        },
    },
    required: ["questions", "answers"],
}

function prompt(from: number, to: number, sent: number[]) {
    const range = from === to ? `page ${from}` : `pages ${from}–${to}`
    const context = sent.filter(p => p < from || p > to)
    return `You are extracting exam questions from images of a printed question paper. Each image is one page and is preceded by its page number.

Extract every question that STARTS on ${range}.${context.length ? ` Pages ${context.join(", ")} are context only: use them to finish a question that continues across a page break, but do not extract questions that start on them.` : ""}
Also put every answer-key entry and worked solution printed on ${range} into "answers".

For each question:
- number: the printed question number, e.g. "17".
- text: the question stem exactly as printed, without the number and without the options.
- options: in printed order, label as printed (A, B, C, D) and the option text. If an option is, or contains, a picture, give its location in "figure" and keep any printed text.
- figures: the location of every diagram, graph, chart, structure or table image that belongs to the question stem. Do not describe pictures in words.
- If one picture holds several labelled panels that the options refer to (e.g. curves A–D), put the whole picture in the question's figures, not in the options.
- type: "INTEGER" if the question has no options and expects a numeric answer; "MULTIPLE" if the paper says one or more options may be correct, or its answer has more than one option; otherwise "SINGLE".
- answer and solution: only if printed right next to the question; otherwise null.
- section: the section heading the question sits under, if any.

Text formatting (question text, options and solutions):
- Subscripts as _{...} and superscripts as ^{...}: H_{2}O, 1.93 × 10^{5}, Cu^{2+}, SO_{4}^{2−}, E°_{cell}, Λ°_{m}, K_{sp}.
- Use Unicode for symbols: × → ⇌ ° Λ κ √ − ≈ ≤ ≥ Δ. Never use LaTeX commands or $ signs.
- Keep numbers, units and signs exactly as printed.

Picture locations: "page" is the page the picture is on and "box" is [ymin, xmin, ymax, xmax] normalised to 0–1000 for that page image. Box just the picture with its own labels, axis titles and legend, not the surrounding question text.

answers: one entry per answer-key or worked-solution entry: number, the answer exactly as printed (e.g. "B", "A, C", "12"), and the solution text if one is given.

Ignore running headers, footers and page numbers. Return only the JSON.`
}

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const keys = getAllKeys()
    if (keys.length === 0) {
        return NextResponse.json({ error: "AI is not configured. Set GEMINI_API_KEYS on the server." }, { status: 503 })
    }

    let body: { pages?: { page: number; image: string }[]; from?: number; to?: number }
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

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = []
    const sent: number[] = []
    for (const p of pages) {
        const m = typeof p?.image === "string" && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(p.image)
        if (!m || p.image.length > MAX_IMAGE_CHARS || !Number.isInteger(p.page)) {
            return NextResponse.json({ error: `Page ${p?.page ?? "?"} is not a valid image` }, { status: 400 })
        }
        sent.push(p.page)
        parts.push({ text: `Page ${p.page}:` }, { inlineData: { mimeType: m[1], data: m[2] } })
    }
    parts.push({ text: prompt(from, to, sent) })

    // Try a couple of keys: one may be rate-limited.
    const shuffled = [...keys].sort(() => Math.random() - 0.5).slice(0, 3)
    let lastError = ""
    for (const key of shuffled) {
        try {
            const model = new GoogleGenerativeAI(key).getGenerativeModel({
                model: MODEL,
                generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
            })
            const result = await model.generateContent(parts)
            const json = JSON.parse(result.response.text())
            return NextResponse.json(sanitizeExtraction(json, sent))
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error)
            console.error("[PDF_EXTRACT]", lastError)
            if (!/429|quota|rate|503|overloaded|unavailable/i.test(lastError)) break
        }
    }

    const busy = /429|quota|rate/i.test(lastError)
    return NextResponse.json(
        { error: busy ? "The AI service is busy or out of quota. Try again in a minute." : "The AI couldn't read these pages." },
        { status: busy ? 429 : 502 }
    )
}
