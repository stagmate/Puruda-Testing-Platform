// Validation for answers saved during a test (autosave). Only answers to the
// test's own questions, in the shapes the test screen produces, are kept.

const MAX_TEXT = 40
const MAX_OPTIONS = 10

function cleanValue(v: unknown): number | number[] | string | undefined {
    if (typeof v === "number") return Number.isInteger(v) && v >= 0 && v < MAX_OPTIONS ? v : undefined
    if (Array.isArray(v)) {
        if (v.length > MAX_OPTIONS || !v.every(x => typeof x === "number" && Number.isInteger(x) && x >= 0 && x < MAX_OPTIONS)) return undefined
        return Array.from(new Set(v as number[]))
    }
    if (typeof v === "string") return v.length <= MAX_TEXT ? v : undefined
    return undefined
}

/** Keep only well-formed answers to questions in this test. */
export function cleanAnswers(raw: unknown, questionIds: Set<string>): Record<string, number | number[] | string> {
    const out: Record<string, number | number[] | string> = {}
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!questionIds.has(id)) continue
        const c = cleanValue(v)
        if (c !== undefined) out[id] = c
    }
    return out
}

/** Question numbers (0-based) the student has opened. */
export function cleanVisited(raw: unknown, questionCount: number): number[] {
    if (!Array.isArray(raw)) return []
    return Array.from(new Set(raw.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < questionCount))).sort((a, b) => a - b)
}

export function parseJson(s: string | null | undefined): unknown {
    try { return s ? JSON.parse(s) : null } catch { return null }
}
