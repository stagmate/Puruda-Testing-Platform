// Validates and normalises a question coming from any source (editor, PDF import,
// CSV, test-creation quick add) into the fields stored on the Question model.
// Shared by the API routes and the browser (for showing problems before saving).

import { OPTION_LETTERS, correctOptionIndexes, resolveOptionIndex } from "@/lib/grading"

export const QUESTION_TYPES = ["SINGLE", "MULTIPLE", "INTEGER"] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]
export const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const MAX_OPTIONS = 4 // option images exist for A–D

/** What the editor and the PDF importer work with. `correct` holds option letters, or the value for INTEGER. */
export type QuestionDraft = {
    type: QuestionType
    text: string
    imageUrl: string | null
    options: string[]            // always MAX_OPTIONS long in the editor
    optionImages: (string | null)[]
    correct: string[]
    solution: string
    difficulty: Difficulty
}

export type QuestionFields = {
    text: string
    type: QuestionType
    difficulty: Difficulty
    options: string            // JSON array
    correct: string
    imageUrl: string | null
    optionAImageUrl: string | null
    optionBImageUrl: string | null
    optionCImageUrl: string | null
    optionDImageUrl: string | null
    solution: string | null
    hasDiagram: boolean
}

export function emptyDraft(type: QuestionType = "SINGLE"): QuestionDraft {
    return {
        type,
        text: "",
        imageUrl: null,
        options: Array(MAX_OPTIONS).fill(""),
        optionImages: Array(MAX_OPTIONS).fill(null),
        correct: [],
        solution: "",
        difficulty: "INTERMEDIATE",
    }
}

function cleanUrl(v: unknown): string | null {
    if (typeof v !== "string") return null
    const s = v.trim()
    if (!s || s.length > 500) return null
    // Our own uploads (/api/assets/…, legacy /uploads/…) or a normal web image.
    return s.startsWith("/") || /^https?:\/\//i.test(s) ? s : null
}

function toTokens(correct: unknown): string[] {
    if (Array.isArray(correct)) return correct.map(c => String(c).trim()).filter(Boolean)
    if (typeof correct === "number") return [String(correct)]
    if (typeof correct !== "string") return []
    const s = correct.trim()
    if (!s) return []
    if (s.startsWith("[")) {
        try {
            const parsed = JSON.parse(s)
            if (Array.isArray(parsed)) return parsed.map(c => String(c).trim()).filter(Boolean)
        } catch { /* fall through */ }
    }
    return [s]
}

/**
 * Normalise raw input into stored question fields.
 * Accepts `correct` as letters ("B", ["A","C"]), option text, "Option B", a JSON array, or a number for INTEGER.
 */
export function normalizeQuestion(raw: Record<string, unknown>): { fields?: QuestionFields; error?: string } {
    const type = String(raw.type ?? "SINGLE").toUpperCase()
    if (!(QUESTION_TYPES as readonly string[]).includes(type)) return { error: "Type must be SINGLE, MULTIPLE or INTEGER" }

    const difficultyRaw = String(raw.difficulty || "INTERMEDIATE").toUpperCase()
    if (!(DIFFICULTIES as readonly string[]).includes(difficultyRaw)) return { error: "Difficulty must be BEGINNER, INTERMEDIATE or ADVANCED" }

    const text = typeof raw.text === "string" ? raw.text.trim() : ""
    const imageUrl = cleanUrl(raw.imageUrl)
    if (!text && !imageUrl) return { error: "Question text or image is required" }

    const solution = typeof raw.solution === "string" && raw.solution.trim() ? raw.solution.trim() : null
    const tokens = toTokens(raw.correct)

    const base = {
        text,
        type: type as QuestionType,
        difficulty: difficultyRaw as Difficulty,
        imageUrl,
        solution,
    }

    if (type === "INTEGER") {
        if (tokens.length !== 1 || !Number.isFinite(parseFloat(tokens[0]))) {
            return { error: "Integer questions need a numeric answer" }
        }
        return {
            fields: {
                ...base,
                options: "[]",
                correct: tokens[0],
                optionAImageUrl: null, optionBImageUrl: null, optionCImageUrl: null, optionDImageUrl: null,
                hasDiagram: !!imageUrl,
            },
        }
    }

    // MCQ: options (text and/or image) in slots A–D
    let options = (Array.isArray(raw.options) ? raw.options : []).slice(0, MAX_OPTIONS).map(o => (typeof o === "string" ? o.trim() : ""))
    let images = (Array.isArray(raw.optionImages) ? raw.optionImages : []).slice(0, MAX_OPTIONS).map(cleanUrl)
    while (options.length < MAX_OPTIONS) options.push("")
    while (images.length < MAX_OPTIONS) images.push(null)

    // Drop empty trailing slots so a 3-option question doesn't show a blank "D"
    let last = MAX_OPTIONS - 1
    while (last >= 0 && !options[last] && !images[last]) last--
    options = options.slice(0, last + 1)
    images = images.slice(0, last + 1)

    const filled = options.filter((o, i) => o || images[i]).length
    if (filled < 2) return { error: "Add at least two options (text or image)" }
    if (options.some((o, i) => !o && !images[i])) return { error: "Options can't be blank in the middle; fill or remove them" }

    if (tokens.length === 0) return { error: "Choose the correct option" }
    // "A,C" / "A|C" for multiple-correct: split only if the whole string isn't itself an option
    let answerTokens = tokens
    if (tokens.length === 1 && resolveOptionIndex(tokens[0], options) === -1 && /[,|;]/.test(tokens[0])) {
        answerTokens = tokens[0].split(/[,|;]/).map(t => t.trim()).filter(Boolean)
    }
    const idxs = Array.from(new Set(answerTokens.map(t => resolveOptionIndex(t, options))))
    if (idxs.some(i => i < 0 || i >= options.length)) return { error: "The correct answer doesn't match any option" }
    if (type === "SINGLE" && idxs.length !== 1) return { error: "Single-correct questions need exactly one correct option" }
    idxs.sort((a, b) => a - b)

    // Store the option text when it identifies the option unambiguously, else the letter.
    const encode = (i: number) => {
        const t = options[i]
        const unique = t && options.filter(o => o.toLowerCase() === t.toLowerCase()).length === 1
        return unique ? t : OPTION_LETTERS[i]
    }
    const correct = type === "MULTIPLE" ? JSON.stringify(idxs.map(encode)) : encode(idxs[0])

    return {
        fields: {
            ...base,
            options: JSON.stringify(options),
            correct,
            optionAImageUrl: images[0] ?? null,
            optionBImageUrl: images[1] ?? null,
            optionCImageUrl: images[2] ?? null,
            optionDImageUrl: images[3] ?? null,
            hasDiagram: !!imageUrl || images.some(Boolean),
        },
    }
}

/** Turn a stored question back into an editable draft. */
export function draftFromQuestion(q: {
    type?: string | null; text: string; options: string; correct: string; imageUrl?: string | null
    optionAImageUrl?: string | null; optionBImageUrl?: string | null; optionCImageUrl?: string | null; optionDImageUrl?: string | null
    solution?: string | null; difficulty?: string | null
}): QuestionDraft {
    const type = (QUESTION_TYPES as readonly string[]).includes(q.type || "") ? (q.type as QuestionType) : "SINGLE"
    const draft = emptyDraft(type)
    draft.text = q.text
    draft.imageUrl = q.imageUrl ?? null
    draft.solution = q.solution ?? ""
    draft.difficulty = (DIFFICULTIES as readonly string[]).includes(q.difficulty || "") ? (q.difficulty as Difficulty) : "INTERMEDIATE"
    if (type === "INTEGER") {
        draft.correct = q.correct ? [q.correct] : []
        return draft
    }
    let opts: string[] = []
    try { const p = JSON.parse(q.options); if (Array.isArray(p)) opts = p.map(String) } catch { /* ignore */ }
    opts.slice(0, MAX_OPTIONS).forEach((o, i) => { draft.options[i] = o })
    draft.optionImages = [q.optionAImageUrl ?? null, q.optionBImageUrl ?? null, q.optionCImageUrl ?? null, q.optionDImageUrl ?? null]
    draft.correct = correctOptionIndexes({ type, options: q.options, correct: q.correct }).map(i => OPTION_LETTERS[i])
    return draft
}
