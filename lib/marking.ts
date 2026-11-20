// Marking schemes: how many marks a question is worth and what a wrong answer
// costs. Stored on each test as JSON; tests without one use STANDARD (1 mark per
// correct answer, nothing deducted), which is how every test was scored before.

import { parseOptions, resolveMultipleCorrect, isAnswerCorrect, type GradableQuestion } from "@/lib/grading"

export type MarkingScheme = {
    single: { correct: number; wrong: number }
    /** partial: when no wrong option is chosen, +1 for each correct option chosen (JEE Advanced). */
    multiple: { correct: number; wrong: number; partial: boolean }
    numeric: { correct: number; wrong: number }
}

export const MARKING_PRESETS = {
    STANDARD: {
        label: "Standard (1 per correct, no negative)",
        scheme: { single: { correct: 1, wrong: 0 }, multiple: { correct: 1, wrong: 0, partial: false }, numeric: { correct: 1, wrong: 0 } },
    },
    JEE_MAIN: {
        label: "JEE Main (+4 / −1)",
        scheme: { single: { correct: 4, wrong: -1 }, multiple: { correct: 4, wrong: -1, partial: false }, numeric: { correct: 4, wrong: -1 } },
    },
    JEE_ADVANCED: {
        label: "JEE Advanced (+3/−1 single, +4/partial/−2 multiple, +4 numeric)",
        scheme: { single: { correct: 3, wrong: -1 }, multiple: { correct: 4, wrong: -2, partial: true }, numeric: { correct: 4, wrong: 0 } },
    },
} as const satisfies Record<string, { label: string; scheme: MarkingScheme }>

export type MarkingPreset = keyof typeof MARKING_PRESETS
export const STANDARD_SCHEME: MarkingScheme = MARKING_PRESETS.STANDARD.scheme

export function isMarkingPreset(v: unknown): v is MarkingPreset {
    return typeof v === "string" && v in MARKING_PRESETS
}

const mark = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= 100 ? v : fallback

/** Turn a preset name or a (possibly partial) scheme object into a valid scheme. */
export function normalizeScheme(raw: unknown): MarkingScheme {
    if (isMarkingPreset(raw)) return structuredClone(MARKING_PRESETS[raw].scheme)
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown> | undefined>
    const d = STANDARD_SCHEME
    const scheme: MarkingScheme = {
        single: { correct: mark(r.single?.correct, d.single.correct), wrong: mark(r.single?.wrong, d.single.wrong) },
        multiple: { correct: mark(r.multiple?.correct, d.multiple.correct), wrong: mark(r.multiple?.wrong, d.multiple.wrong), partial: r.multiple?.partial === true },
        numeric: { correct: mark(r.numeric?.correct, d.numeric.correct), wrong: mark(r.numeric?.wrong, d.numeric.wrong) },
    }
    // Marks for a correct answer must be positive and a wrong answer can't earn marks.
    for (const k of ["single", "multiple", "numeric"] as const) {
        if (scheme[k].correct < 1) scheme[k].correct = 1
        if (scheme[k].wrong > 0) scheme[k].wrong = 0
    }
    return scheme
}

/** The scheme stored on a test (JSON), or STANDARD. */
export function parseScheme(stored: string | null | undefined): MarkingScheme {
    if (!stored) return STANDARD_SCHEME
    try {
        return normalizeScheme(JSON.parse(stored))
    } catch {
        return STANDARD_SCHEME
    }
}

/** Which preset a scheme matches, if any (for labels and pickers). */
export function presetOf(scheme: MarkingScheme): MarkingPreset | null {
    const key = JSON.stringify(scheme)
    for (const [name, p] of Object.entries(MARKING_PRESETS)) if (JSON.stringify(p.scheme) === key) return name as MarkingPreset
    return null
}

export function describeScheme(scheme: MarkingScheme): string {
    const preset = presetOf(scheme)
    if (preset) return MARKING_PRESETS[preset].label
    const s = (n: number) => (n > 0 ? `+${n}` : `${n}`)
    return `Single ${s(scheme.single.correct)}/${s(scheme.single.wrong)}, multiple ${s(scheme.multiple.correct)}/${s(scheme.multiple.wrong)}${scheme.multiple.partial ? " (partial)" : ""}, numeric ${s(scheme.numeric.correct)}/${s(scheme.numeric.wrong)}`
}

const unanswered = (a: unknown) => a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0)

function rule(type: string | null | undefined, scheme: MarkingScheme) {
    if (type === "MULTIPLE") return scheme.multiple
    if (type === "INTEGER") return scheme.numeric
    return scheme.single
}

/** Most marks a question can earn. */
export function maxMarks(question: GradableQuestion, scheme: MarkingScheme): number {
    return rule(question.type, scheme).correct
}

/** Marks for one answer: full, partial (MULTIPLE), zero when unanswered, or the penalty. */
export function questionMarks(question: GradableQuestion, answer: unknown, scheme: MarkingScheme): number {
    if (unanswered(answer)) return 0
    const r = rule(question.type, scheme)
    if (isAnswerCorrect(question, answer)) return r.correct

    if (question.type === "MULTIPLE" && scheme.multiple.partial && Array.isArray(answer)) {
        const options = parseOptions(question.options)
        const expected = new Set(resolveMultipleCorrect(String(question.correct ?? ""), options))
        const chosen = Array.from(new Set(answer.filter((a): a is number => typeof a === "number" && Number.isInteger(a))))
        if (expected.size > 0 && chosen.length > 0 && chosen.length === answer.length && chosen.every(i => expected.has(i))) {
            return Math.min(chosen.length, r.correct)
        }
    }
    return r.wrong
}

export function gradeWithScheme(
    questions: (GradableQuestion & { id: string })[],
    responses: Record<string, unknown>,
    scheme: MarkingScheme = STANDARD_SCHEME
): { score: number; total: number } {
    let score = 0
    let total = 0
    for (const q of questions) {
        score += questionMarks(q, responses[q.id], scheme)
        total += maxMarks(q, scheme)
    }
    return { score, total }
}
