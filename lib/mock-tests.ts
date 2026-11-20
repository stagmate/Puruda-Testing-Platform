// One-off: build the JEE mock tests from the JEE Part Test-1 papers already in
// the question bank. Run at deploy time by scripts/create-mock-tests.ts.

import { MARKING_PRESETS, type MarkingPreset } from "@/lib/marking"

export type MockTestDef = {
    title: string
    examTag: string
    duration: number
    marking: MarkingPreset
    /** Subjects in paper order, with how many questions each has. */
    subjects: [string, number][]
}

export const MOCK_TESTS: MockTestDef[] = [
    {
        title: "JEE Mains Mock Test",
        examTag: "JEE Main Part Test-1 (03-11-2026)",
        duration: 180,
        marking: "JEE_MAIN",
        subjects: [["Mathematics", 25], ["Physics", 25], ["Chemistry", 25]],
    },
    {
        title: "JEE Advanced Mock Test",
        examTag: "JEE Advanced Part Test-1 (03-11-2026)",
        duration: 180,
        marking: "JEE_ADVANCED",
        subjects: [["Mathematics", 18], ["Physics", 18], ["Chemistry", 18]],
    },
]

export type BankQuestion = {
    id: string
    createdAt: Date
    subject: { name: string } | null
    courseId: string | null
    batchId: string | null
}

export type MockTestPlan =
    | { ok: true; questionIds: string[]; courseId: string | null; batchIds: string[]; markingScheme: string }
    | { ok: false; reason: string }

/**
 * Work out a test's questions in paper order. A pack is saved in one request
 * with timestamps that count down in paper order, so newest first is paper
 * order. Refuses anything that doesn't look exactly like the paper (missing
 * questions, duplicates from importing twice), rather than guessing.
 */
export function planMockTest(def: MockTestDef, questions: BankQuestion[]): MockTestPlan {
    const expected = def.subjects.reduce((n, [, c]) => n + c, 0)
    if (questions.length !== expected) {
        return { ok: false, reason: `expected ${expected} questions tagged "${def.examTag}", found ${questions.length}` }
    }
    const ordered = [...questions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id))

    let i = 0
    for (const [subject, count] of def.subjects) {
        for (let k = 0; k < count; k++, i++) {
            const got = ordered[i].subject?.name ?? "no subject"
            if (got.toLowerCase() !== subject.toLowerCase()) {
                return { ok: false, reason: `question ${i + 1} should be ${subject} but is ${got}` }
            }
        }
    }

    const courses = new Set(ordered.map(q => q.courseId))
    return {
        ok: true,
        questionIds: ordered.map(q => q.id),
        courseId: courses.size === 1 ? ordered[0].courseId : null,
        batchIds: Array.from(new Set(ordered.map(q => q.batchId).filter((b): b is string => !!b))),
        markingScheme: JSON.stringify(MARKING_PRESETS[def.marking].scheme),
    }
}
