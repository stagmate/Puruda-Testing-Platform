import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { parseScheme, describeScheme } from "@/lib/marking"
import { orderTestQuestions } from "@/lib/test-order"
import { parseAnswers, rankOf, subjectBreakdown } from "@/lib/result-breakdown"

// Every test the logged-in student has submitted, newest first, with the
// per-subject breakdown. Results of "manual release" tests are listed without
// their marks.
export async function GET() {
    const auth = await requireRole(["STUDENT"])
    if (auth.response) return auth.response

    const results = await db.testResult.findMany({
        where: { userId: auth.user.id },
        orderBy: { completedAt: "desc" },
        include: {
            test: {
                select: {
                    id: true, title: true, duration: true, resultMode: true, showRank: true, markingScheme: true, questionOrder: true,
                    questions: { select: { id: true, type: true, options: true, correct: true, createdAt: true, subject: { select: { name: true } } } },
                },
            },
        },
    })

    const rankTests = results.filter(r => r.test.showRank && r.test.resultMode !== "MANUAL").map(r => r.testId)
    const allScores = rankTests.length
        ? await db.testResult.findMany({ where: { testId: { in: rankTests } }, select: { testId: true, score: true } })
        : []

    return NextResponse.json(results.map(r => {
        const released = r.test.resultMode !== "MANUAL"
        const scheme = parseScheme(r.test.markingScheme)
        const base = {
            id: r.id,
            testId: r.testId,
            title: r.test.title,
            completedAt: r.completedAt,
            questionCount: r.test.questions.length,
            released,
        }
        if (!released) return base
        const scores = allScores.filter(s => s.testId === r.testId).map(s => s.score)
        return {
            ...base,
            score: r.score,
            total: r.total,
            percentage: r.total > 0 ? Math.round((r.score / r.total) * 1000) / 10 : 0,
            marking: describeScheme(scheme),
            rank: r.test.showRank ? { rank: rankOf(r.score, scores), of: scores.length } : null,
            subjects: subjectBreakdown(orderTestQuestions(r.test.questions, r.test.questionOrder), parseAnswers(r.answers), scheme),
        }
    }))
}
