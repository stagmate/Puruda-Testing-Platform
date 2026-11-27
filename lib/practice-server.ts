// Server helpers for free PYQ practice attempts.

import { db } from "@/lib/db"
import { gradeWithScheme, parseScheme } from "@/lib/marking"
import { parseIds, parseSeconds, practiceDeadline } from "@/lib/pyq"
import { parseAnswers } from "@/lib/result-breakdown"

/** Questions published for learners: those filed under a published PYQ paper. */
export const PUBLISHED_PYQ = { pyqPaper: { isPublished: true } } as const

export const questionForReview = {
    id: true, type: true, text: true, options: true, correct: true, solution: true, createdAt: true,
    imageUrl: true, optionAImageUrl: true, optionBImageUrl: true, optionCImageUrl: true, optionDImageUrl: true,
    subject: { select: { name: true } }, chapter: { select: { name: true } },
    pyqPaper: { select: { title: true } },
} as const

/** The attempt if it belongs to this user. */
export async function ownAttempt(id: string, userId: string) {
    const a = await db.practiceAttempt.findUnique({ where: { id } })
    return a && a.userId === userId ? a : null
}

/** The attempt's questions in its own order (with answers: callers decide what to send). */
export async function attemptQuestions(questionIdsJson: string) {
    const ids = parseIds(questionIdsJson)
    const rows = await db.question.findMany({ where: { id: { in: ids } }, select: questionForReview })
    const byId = new Map(rows.map(q => [q.id, q]))
    return ids.map(id => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q)
}

/** Only keeps answers to questions in the attempt, in a sane shape. */
export function cleanAnswers(raw: unknown, ids: Set<string>): Record<string, unknown> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) {
        if (!ids.has(k)) continue
        if (typeof v === "number" && Number.isInteger(v)) out[k] = v
        else if (Array.isArray(v) && v.every(x => Number.isInteger(x))) out[k] = v.slice(0, 6)
        else if (typeof v === "string" && v.length <= 30) out[k] = v
    }
    return out
}

/** Grades and closes an attempt. Answers already checked in practice mode can't be changed. */
export async function finishAttempt(attemptId: string, incoming: { answers?: unknown; timeSpent?: unknown }) {
    const a = await db.practiceAttempt.findUnique({ where: { id: attemptId } })
    if (!a || a.submittedAt) return a
    const questions = await attemptQuestions(a.questionIds)
    const ids = new Set(questions.map(q => q.id))
    const saved = parseAnswers(a.answers)
    const checked = new Set(parseIds(a.checked))
    const deadline = practiceDeadline(a)
    // After the time limit (plus a minute's grace), only what was saved in time counts.
    const late = deadline && Date.now() > deadline.getTime() + 60_000
    const answers = late ? saved : { ...cleanAnswers(incoming.answers, ids), ...Object.fromEntries([...checked].map(k => [k, saved[k]])) }
    for (const k of Object.keys(answers)) if (answers[k] === undefined) delete answers[k]
    const time = { ...parseSeconds(a.timeSpent), ...parseSeconds(JSON.stringify(incoming.timeSpent ?? {})) }
    const { score, total } = gradeWithScheme(questions, answers, parseScheme(a.markingScheme))
    return db.practiceAttempt.update({
        where: { id: a.id },
        data: { answers: JSON.stringify(answers), timeSpent: JSON.stringify(time), submittedAt: new Date(), score, total },
    })
}
