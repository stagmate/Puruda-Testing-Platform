import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { parseScheme } from "@/lib/marking"
import { VISIBLE_RESULTS_WHERE } from "@/lib/result-visibility"
import { orderTestQuestions } from "@/lib/test-order"
import { parseAnswers, subjectBreakdown } from "@/lib/result-breakdown"

export async function POST(req: Request) {
    try {
        const currentUser = await getSessionUser()

        if (!currentUser) return new NextResponse("Unauthorized", { status: 401 })

        // Get target student ID (Teachers can view any student, Students only themselves)
        const { studentId } = await req.json().catch(() => ({}))
        const targetId = (currentUser.role === "TEACHER" || currentUser.role === "ADMIN") && studentId
            ? studentId
            : currentUser.id

        // Fetch User and Batch Info
        const user = await db.user.findUnique({
            where: { id: targetId },
            include: {
                batches: { include: { course: true } }
            }
        })

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

        // Fetch Test Results. Students don't see marks of unreleased "manual release" tests.
        const results = await db.testResult.findMany({
            where: {
                userId: targetId,
                ...(currentUser.role === "STUDENT" ? { test: VISIBLE_RESULTS_WHERE } : {}),
            },
            orderBy: { completedAt: 'desc' },
            include: {
                test: {
                    select: {
                        title: true, markingScheme: true, questionOrder: true,
                        questions: { select: { id: true, type: true, options: true, correct: true, createdAt: true, subject: { select: { name: true } } } },
                    },
                },
            },
        })

        // Calculate Stats
        const totalTests = results.length
        const totalScore = results.reduce((acc, r) => acc + r.score, 0)
        const maxScore = results.reduce((acc, r) => acc + r.total, 0)
        const averageAccuracy = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

        // Subject breakdown from the saved answers, question by question
        const subjectStats: Record<string, { score: number, total: number }> = {}
        for (const r of results) {
            const rows = subjectBreakdown(orderTestQuestions(r.test.questions, r.test.questionOrder), parseAnswers(r.answers), parseScheme(r.test.markingScheme))
            for (const row of rows) {
                const s = (subjectStats[row.subject] ??= { score: 0, total: 0 })
                s.score += row.score
                s.total += row.total
            }
        }

        // Safe access to batch info
        const userWithBatches = user as any
        const batchName = userWithBatches.batches && userWithBatches.batches.length > 0 ? userWithBatches.batches[0].name : "N/A"
        const courseName = userWithBatches.batches && userWithBatches.batches.length > 0 && userWithBatches.batches[0].course ? userWithBatches.batches[0].course.name : "N/A"

        const reportData = {
            student: {
                name: user.name,
                email: user.email,
                course: courseName,
                batch: batchName
            },
            stats: {
                testsTaken: totalTests,
                averageAccuracy: Math.round(averageAccuracy),
                totalScore,
                maxPossibleScore: maxScore
            },
            subjectPerformance: Object.entries(subjectStats).map(([subj, val]) => ({
                subject: subj,
                accuracy: val.total > 0 ? Math.max(0, Math.round((val.score / val.total) * 100)) : 0
            })),
            recentHistory: results.slice(0, 20).map(r => ({
                test: r.test.title,
                score: r.score,
                total: r.total,
                date: r.completedAt
            }))
        }

        return NextResponse.json(reportData)

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
