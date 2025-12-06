import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || !(session.user as any).id) return new NextResponse("Unauthorized", { status: 401 })

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
            if (userAnswer === undefined || userAnswer === null) return

            const type = q.type || 'SINGLE'
            let isCorrect = false

            // Parse Options if needed
            let options: string[] = []
            try {
                options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            } catch (e) { options = [] }

            if (type === 'INTEGER') {
                // Integer Logic: Compare numeric values with epsilon
                const userVal = parseFloat(userAnswer.toString())
                const correctVal = parseFloat(q.correct)
                if (!isNaN(userVal) && !isNaN(correctVal)) {
                    isCorrect = Math.abs(userVal - correctVal) < 0.01
                } else {
                    // Fallback for string matching
                    isCorrect = userAnswer.toString().trim() === q.correct.toString().trim()
                }
            } else if (type === 'MULTIPLE') {
                // MSQ Logic: userAnswer should be array of indices or strings
                // We resolve indices to values to compare with q.correct (which is JSON array of values)
                let correctAnswers: string[] = []
                try {
                    correctAnswers = typeof q.correct === 'string' ? JSON.parse(q.correct) : q.correct
                } catch (e) { correctAnswers = [] } // Or maybe single string?

                let userSelectedValues: string[] = []
                if (Array.isArray(userAnswer)) {
                    userSelectedValues = userAnswer.map((idx: any) => {
                        return typeof idx === 'number' && options[idx] ? options[idx] : idx.toString()
                    })
                }

                // Sorting for comparison
                const sortedUser = [...userSelectedValues].sort()
                const sortedCorrect = [...correctAnswers].sort()

                isCorrect = sortedUser.length === sortedCorrect.length &&
                    sortedUser.every((val, index) => val === sortedCorrect[index])

            } else {
                // SINGLE (MCQ) Logic
                // Resolve index to value
                const userVal = typeof userAnswer === 'number' && options[userAnswer] ? options[userAnswer] : userAnswer.toString()
                isCorrect = userVal === q.correct
            }

            if (isCorrect) score++
        })

        // Create Result
        const result = await db.testResult.create({
            data: {
                testId,
                userId: (session.user as any).id,
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
