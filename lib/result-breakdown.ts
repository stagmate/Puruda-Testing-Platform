// Per-subject breakdown of a submitted test, worked out from the saved answers
// with the test's marking scheme.

import { isAnswerCorrect, type GradableQuestion } from "@/lib/grading"
import { questionMarks, maxMarks, type MarkingScheme } from "@/lib/marking"
import { isAnswered } from "@/lib/test-progress"

export type SubjectResult = {
    subject: string
    score: number
    total: number
    correct: number
    partial: number
    wrong: number
    unanswered: number
}

type Q = GradableQuestion & { id: string; subject?: { name: string } | null }

/** Subjects in the order they first appear in the test. */
export function subjectBreakdown(questions: Q[], answers: Record<string, unknown>, scheme: MarkingScheme): SubjectResult[] {
    const rows = new Map<string, SubjectResult>()
    for (const q of questions) {
        const subject = q.subject?.name ?? "General"
        const row = rows.get(subject) ?? { subject, score: 0, total: 0, correct: 0, partial: 0, wrong: 0, unanswered: 0 }
        const answer = answers[q.id]
        const marks = questionMarks(q, answer, scheme)
        row.score += marks
        row.total += maxMarks(q, scheme)
        if (!isAnswered(answer)) row.unanswered++
        else if (isAnswerCorrect(q, answer)) row.correct++
        else if (marks > 0) row.partial++
        else row.wrong++
        rows.set(subject, row)
    }
    return Array.from(rows.values())
}

export function parseAnswers(json: string | null | undefined): Record<string, unknown> {
    try {
        const parsed = JSON.parse(json || "{}")
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
    } catch {
        return {}
    }
}

/** 1 + how many other results scored more (ties share a rank). */
export function rankOf(score: number, allScores: number[]): number {
    return 1 + allScores.filter(s => s > score).length
}
