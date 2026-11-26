// Question-by-question review of a submitted test: what the student answered,
// the correct answer, the marks for each question and the solution.

import { correctOptionIndexes, formatCorrectAnswer, isAnswerCorrect, parseOptions, type GradableQuestion } from "@/lib/grading"
import { maxMarks, questionMarks, type MarkingScheme } from "@/lib/marking"
import { isAnswered } from "@/lib/test-progress"

export type ReviewStatus = "correct" | "partial" | "wrong" | "unanswered"

export type ReviewQuestion = GradableQuestion & {
    id: string
    text: string
    imageUrl?: string | null
    optionAImageUrl?: string | null
    optionBImageUrl?: string | null
    optionCImageUrl?: string | null
    optionDImageUrl?: string | null
    solution?: string | null
    subject?: { name: string } | null
    chapter?: { name: string } | null
}

export type ReviewItem = {
    id: string
    number: number
    subject: string | null
    chapter: string | null
    type: "SINGLE" | "MULTIPLE" | "INTEGER"
    text: string
    imageUrl: string | null
    options: { text: string; image: string | null }[]
    /** Option indexes the student chose (MCQ), or null. */
    chosen: number[] | null
    /** The value the student typed (numeric questions), or null. */
    typed: string | null
    status: ReviewStatus
    marks: number
    maxMarks: number
    /** Left out while answers are hidden (the test is still open for others). */
    correct?: number[]
    correctText?: string
    solution?: string | null
}

function chosenIndexes(answer: unknown): number[] | null {
    if (Array.isArray(answer)) {
        const out = answer.map(Number).filter(n => Number.isInteger(n) && n >= 0)
        return out.length ? Array.from(new Set(out)).sort((a, b) => a - b) : null
    }
    if (typeof answer === "number" && Number.isInteger(answer) && answer >= 0) return [answer]
    if (typeof answer === "string" && /^\d+$/.test(answer.trim())) return [Number(answer.trim())]
    return null
}

/**
 * Builds the review for each question, in test order. With `revealAnswers`
 * false, the correct answers and solutions are left out (the student's own
 * answers, status and marks are still included).
 */
export function buildReview(
    questions: ReviewQuestion[],
    answers: Record<string, unknown>,
    scheme: MarkingScheme,
    revealAnswers: boolean,
): ReviewItem[] {
    return questions.map((q, i) => {
        const type = (q.type === "MULTIPLE" || q.type === "INTEGER" ? q.type : "SINGLE") as ReviewItem["type"]
        const answer = answers[q.id]
        const marks = questionMarks(q, answer, scheme)
        const status: ReviewStatus = !isAnswered(answer)
            ? "unanswered"
            : isAnswerCorrect(q, answer) ? "correct" : marks > 0 ? "partial" : "wrong"
        const images = [q.optionAImageUrl, q.optionBImageUrl, q.optionCImageUrl, q.optionDImageUrl]
        const item: ReviewItem = {
            id: q.id,
            number: i + 1,
            subject: q.subject?.name ?? null,
            chapter: q.chapter?.name ?? null,
            type,
            text: q.text,
            imageUrl: q.imageUrl ?? null,
            options: type === "INTEGER" ? [] : parseOptions(q.options).map((text, k) => ({ text, image: images[k] ?? null })),
            chosen: type === "INTEGER" ? null : chosenIndexes(answer),
            typed: type === "INTEGER" && isAnswered(answer) ? String(answer).trim() : null,
            status,
            marks,
            maxMarks: maxMarks(q, scheme),
        }
        if (revealAnswers) {
            item.correct = type === "INTEGER" ? [] : correctOptionIndexes(q)
            item.correctText = formatCorrectAnswer(q)
            item.solution = q.solution ?? null
        }
        return item
    })
}

/** Correct answers are shown once nobody can still be taking the test. */
export function answersRevealed(test: { endTime: Date | string | null }, now = Date.now()): boolean {
    return !test.endTime || new Date(test.endTime).getTime() <= now
}
