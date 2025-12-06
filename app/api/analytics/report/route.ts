import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const currentUser = session?.user as any

        if (!currentUser) return new NextResponse("Unauthorized", { status: 401 })

        // Get target student ID (Teachers can view any student, Students only themselves)
        const { studentId } = await req.json()
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

        // Fetch Test Results
        const results = await db.testResult.findMany({
            where: { userId: targetId },
            orderBy: { completedAt: 'desc' },
            include: { test: true }
        })

        // Calculate Stats
        const totalTests = results.length
        const totalScore = results.reduce((acc, r) => acc + r.score, 0)
        const maxScore = results.reduce((acc, r) => acc + r.total, 0)
        const averageAccuracy = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

        // Subject Breakdown
        const subjectStats: Record<string, { score: number, total: number }> = {}

        results.forEach((r: any) => {
            const subject = r.test.type === 'SUBJECT' ? r.test.title.split(' ')[0] : 'General'
            if (!subjectStats[subject]) subjectStats[subject] = { score: 0, total: 0 }
            subjectStats[subject].score += r.score
            subjectStats[subject].total += r.total
        })

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
                accuracy: Math.round((val.score / val.total) * 100)
            })),
            recentHistory: results.slice(0, 5).map((r: any) => ({
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
