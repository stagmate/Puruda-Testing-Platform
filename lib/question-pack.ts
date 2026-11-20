// A question pack is a JSON file holding a whole paper (or several): each question
// as an image of the printed question plus its type and answer key. It is
// imported from the question bank, which uploads the images and saves the
// questions under the right subject.
//
// {
//   "format": "puruda-question-pack", "version": 1, "title": "…",
//   "questions": [{
//     "paper": "JEE Main Part Test-1",      // saved as the question's exam tag
//     "subject": "Physics",                 // matched to a subject by name (created if missing)
//     "section": "SECTION-I", "number": 3,  // for display only
//     "type": "SINGLE" | "MULTIPLE" | "INTEGER",
//     "correct": "B" | "A,C" | "12" | "8.80 to 9.40",
//     "options": ["(A)", "(B)", "(C)", "(D)"], // MCQ only; the option content is in the image
//     "image": "data:image/png;base64,…",
//     "text": "", "difficulty": "ADVANCED", "solution": "…"   // optional
//   }]
// }

import { normalizeQuestion } from "@/lib/question-input"

export const PACK_FORMAT = "puruda-question-pack"
export const MAX_PACK_IMAGE_BYTES = 5 * 1024 * 1024 // same limit as /api/upload

export type PackQuestion = {
    paper: string
    subject: string
    section: string
    number: number | null
    type: string
    correct: string
    options: string[]
    image: string
    text: string
    difficulty: string
    solution: string
}

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+=*)$/

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** Decoded size of a base64 data URL, without decoding it. */
export function dataUrlBytes(dataUrl: string): number {
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
    const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0
    return Math.floor((b64.length * 3) / 4) - pad
}

/**
 * Check a parsed pack. Every question is also run through the same validation
 * the server uses, so a bad answer key is caught before any image is uploaded.
 */
export function readPack(raw: unknown): { title: string; questions: PackQuestion[]; problems: string[] } {
    const problems: string[] = []
    const pack = raw as Record<string, unknown> | null
    if (!pack || typeof pack !== "object" || pack.format !== PACK_FORMAT) {
        return { title: "", questions: [], problems: ["This isn't a question pack file."] }
    }
    if (pack.version !== 1) return { title: "", questions: [], problems: ["Unsupported question pack version."] }
    if (!Array.isArray(pack.questions) || pack.questions.length === 0) {
        return { title: str(pack.title), questions: [], problems: ["The pack has no questions."] }
    }

    const questions: PackQuestion[] = []
    pack.questions.forEach((item: unknown, i: number) => {
        const q = (item ?? {}) as Record<string, unknown>
        const where = `Question ${i + 1}${str(q.subject) ? ` (${str(q.subject)}${q.number ? ` Q${q.number}` : ""})` : ""}`
        const image = typeof q.image === "string" ? q.image : ""
        const subject = str(q.subject, 100)
        if (!subject) return void problems.push(`${where}: no subject`)
        if (image && !IMAGE_DATA_URL.test(image)) return void problems.push(`${where}: the image isn't a PNG, JPEG, WebP or GIF`)
        if (image && dataUrlBytes(image) > MAX_PACK_IMAGE_BYTES) return void problems.push(`${where}: the image is larger than 5 MB`)

        const pq: PackQuestion = {
            paper: str(q.paper),
            subject,
            section: str(q.section, 50),
            number: typeof q.number === "number" && Number.isFinite(q.number) ? q.number : null,
            type: str(q.type, 20).toUpperCase() || "SINGLE",
            correct: Array.isArray(q.correct) ? q.correct.map(String).join(",") : String(q.correct ?? "").trim(),
            options: Array.isArray(q.options) ? q.options.map(o => String(o)) : [],
            image,
            text: str(q.text, 5000),
            difficulty: str(q.difficulty, 20).toUpperCase() || "INTERMEDIATE",
            solution: str(q.solution, 20000),
        }
        const { error } = normalizeQuestion(toQuestionInput(pq, image ? "/api/assets/pending" : null))
        if (error) return void problems.push(`${where}: ${error}`)
        questions.push(pq)
    })
    return { title: str(pack.title), questions, problems }
}

/** The body the bulk-save endpoint expects for one pack question. */
export function toQuestionInput(q: PackQuestion, imageUrl: string | null, subjectId?: string) {
    return {
        type: q.type,
        text: q.text,
        imageUrl,
        options: q.type === "INTEGER" ? [] : q.options,
        correct: q.correct,
        difficulty: q.difficulty,
        solution: q.solution,
        examTag: q.paper || undefined,
        ...(subjectId ? { subjectId } : {}),
    }
}
