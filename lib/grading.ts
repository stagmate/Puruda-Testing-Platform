// Grading helpers shared by the submit route and tests.
//
// Correct answers reach the database in several formats depending on where the
// question came from:
//   - question bank form: the option text ("Newton"), or a JSON array of texts for MULTIPLE
//   - CSV uploads: option text, a letter ("B"), or "A,C" for MULTIPLE
//   - PDF/regex parser: "(B) Newton"
//   - seed data: an index string ("0")
// Students answer with option indexes (SINGLE / MULTIPLE) or a typed value (INTEGER).
// Everything is normalised to option indexes before comparing.

export type QuestionType = "SINGLE" | "MULTIPLE" | "INTEGER"

export type GradableQuestion = {
    type?: string | null
    options: string | string[]
    correct: string
}

const LETTERS = ["A", "B", "C", "D", "E", "F"]

export function parseOptions(options: string | string[]): string[] {
    if (Array.isArray(options)) return options.map(String)
    try {
        const parsed = JSON.parse(options)
        return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
        return []
    }
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

/** Map one stored answer token to an option index, or -1 if it can't be resolved. */
export function resolveOptionIndex(token: string, options: string[]): number {
    const raw = String(token).trim()
    if (!raw) return -1

    // 1. Exact option text (preferred, so numeric option texts like "4" win over index lookups).
    const textIdx = options.findIndex(o => norm(o) === norm(raw))
    if (textIdx !== -1) return textIdx

    // 2. "Option A" / "option b"
    const optionWord = raw.match(/^option\s*([a-f])$/i)
    if (optionWord) return LETTERS.indexOf(optionWord[1].toUpperCase())

    // 3. A bare letter, or a letter prefix like "(A) text", "A) text", "A. text"
    const letter = raw.match(/^\(?([a-f])\)?(?:[.)\s]|$)/i)
    if (letter) {
        const idx = LETTERS.indexOf(letter[1].toUpperCase())
        if (idx < options.length || options.length === 0) return idx
    }

    // 4. A bare index ("0"), as used by the seed data.
    if (/^\d+$/.test(raw)) {
        const idx = parseInt(raw, 10)
        if (idx >= 0 && idx < options.length) return idx
    }

    return -1
}

/** Parse the stored correct answer for a MULTIPLE question into option indexes. */
export function resolveMultipleCorrect(correct: string, options: string[]): number[] {
    let tokens: string[]
    try {
        const parsed = JSON.parse(correct)
        tokens = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
    } catch {
        tokens = correct.split(/[,|;]/)
    }
    const idxs = tokens.map(t => resolveOptionIndex(t, options)).filter(i => i >= 0)
    return Array.from(new Set(idxs)).sort((a, b) => a - b)
}

/** Turn a student's answer into an option index (accepts an index or the option text). */
function studentIndex(answer: unknown, options: string[]): number {
    if (typeof answer === "number" && Number.isInteger(answer)) {
        return answer >= 0 && answer < options.length ? answer : -1
    }
    if (typeof answer === "string") return resolveOptionIndex(answer, options)
    return -1
}

export function isAnswerCorrect(question: GradableQuestion, answer: unknown): boolean {
    if (answer === undefined || answer === null || answer === "") return false

    const type = (question.type || "SINGLE") as QuestionType
    const options = parseOptions(question.options)
    const correct = String(question.correct ?? "")

    if (type === "INTEGER") {
        if (typeof answer !== "string" && typeof answer !== "number") return false
        const userVal = parseFloat(String(answer))
        const correctVal = parseFloat(correct)
        if (!isNaN(userVal) && !isNaN(correctVal)) {
            return Math.abs(userVal - correctVal) < 0.01
        }
        return norm(String(answer)) === norm(correct)
    }

    if (type === "MULTIPLE") {
        if (!Array.isArray(answer)) return false
        const expected = resolveMultipleCorrect(correct, options)
        if (expected.length === 0) return false
        const given = Array.from(new Set(answer.map(a => studentIndex(a, options))))
            .filter(i => i >= 0)
            .sort((a, b) => a - b)
        return given.length === expected.length && given.every((v, i) => v === expected[i])
    }

    // SINGLE
    const expected = resolveOptionIndex(correct, options)
    if (expected === -1) return false
    return studentIndex(answer, options) === expected
}

export function gradeTest(
    questions: (GradableQuestion & { id: string })[],
    responses: Record<string, unknown>
): { score: number; total: number } {
    let score = 0
    for (const q of questions) {
        if (isAnswerCorrect(q, responses[q.id])) score++
    }
    return { score, total: questions.length }
}

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"]

/** Indexes of the correct options for SINGLE/MULTIPLE questions (empty if unresolvable). */
export function correctOptionIndexes(question: GradableQuestion): number[] {
    const options = parseOptions(question.options)
    const correct = String(question.correct ?? "")
    if ((question.type || "SINGLE") === "MULTIPLE") return resolveMultipleCorrect(correct, options)
    const idx = resolveOptionIndex(correct, options)
    return idx === -1 ? [] : [idx]
}

/** Human-readable answer: "B", "A, C", or the integer value. */
export function formatCorrectAnswer(question: GradableQuestion): string {
    if (question.type === "INTEGER") return String(question.correct ?? "")
    const idxs = correctOptionIndexes(question)
    return idxs.length ? idxs.map(i => OPTION_LETTERS[i] ?? String(i + 1)).join(", ") : String(question.correct ?? "")
}
