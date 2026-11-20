// Attempts whose time ran out without the student submitting (tab closed,
// connection lost) are submitted from their autosaved answers, so the work
// is recorded and scored. Only attempts with saved answers are finalised.
import { db } from "@/lib/db"
import { gradeWithScheme, parseScheme } from "@/lib/marking"
import { attemptDeadline, SUBMIT_GRACE_MS } from "@/lib/test-access"
import { parseJson } from "@/lib/saved-answers"

export async function finalizeExpiredAttempts(scope: { userId?: string; testId?: string } = {}, now = new Date()): Promise<number> {
    const open = await db.testAttempt.findMany({
        where: { submittedAt: null, answersSavedAt: { not: null }, ...scope },
        include: { test: { select: { duration: true, endTime: true, markingScheme: true, questions: true } } },
    })
    let finalized = 0
    for (const a of open) {
        const deadline = attemptDeadline(a.startedAt, a.test)
        if (!deadline || now.getTime() <= deadline.getTime() + SUBMIT_GRACE_MS) continue
        const saved = parseJson(a.answers)
        const answers = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {}
        const { score, total } = gradeWithScheme(a.test.questions, answers, parseScheme(a.test.markingScheme))
        const done = await db.$transaction(async tx => {
            // The submittedAt check stops two requests finalising the same attempt twice.
            const claimed = await tx.testAttempt.updateMany({ where: { id: a.id, submittedAt: null }, data: { submittedAt: deadline } })
            if (claimed.count === 0) return false
            await tx.testResult.create({
                data: { testId: a.testId, userId: a.userId, score, total, answers: JSON.stringify(answers), completedAt: deadline },
            })
            return true
        })
        if (done) finalized++
    }
    return finalized
}
