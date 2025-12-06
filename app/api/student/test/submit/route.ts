import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

        const { testId, responses } = await req.json() // responses: { questionId: optionIndex }

        // Fetch Test and Questions
        const test = await db.test.findUnique({
            where: { id: testId },
            include: { questions: true }
        })

        if (!test) return new NextResponse("Test not found", { status: 404 })

        // Check if test is active (if start/end times exist)
        const now = new Date()
        const t: any = test // Bypass strict typing for now as schema update might lag in IDE
        if (t.startTime && now < new Date(t.startTime)) {
            return new NextResponse("Test has not started yet", { status: 403 })
        }
        if (t.endTime && now > new Date(t.endTime)) {
            // Allow submission shortly after deadline? Strict for now.
            return new NextResponse("Test has ended", { status: 403 })
        }

        // Calculate Score
        let score = 0
        const total = test.questions.length

        test.questions.forEach((q: any) => {
            const userAnswer = responses[q.id]
            // We use 'correct' field from Question model (aliased/used properly)
            // Note: Schema has 'correct', logic might have used 'correctAnswer'
            if (userAnswer !== undefined && userAnswer === parseInt(q.correct)) {
                score++
            }
        })

        // Create Result
        const result = await db.testResult.create({
            data: {
                testId,
                userId: session.user.id,
                score,
                total,
                answers: JSON.stringify(responses), // Storing detailed answers for review
                completedAt: new Date()
            }
        })

        return NextResponse.json(result)

    } catch (error) {
        console.error("Submit Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
