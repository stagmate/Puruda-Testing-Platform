import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { gradeTest } from "@/lib/grading"
import { attemptDeadline, studentAccessError, SUBMIT_GRACE_MS } from "@/lib/test-access"

export async function POST(req: Request) {
    const auth = await requireRole(["STUDENT"])
    if (auth.response) return auth.response
    const userId = auth.user.id

    try {
        const body = await req.json().catch(() => null)
        const testId = body?.testId
        const responses = body?.responses
        if (typeof testId !== "string" || !responses || typeof responses !== "object" || Array.isArray(responses)) {
            return new NextResponse("Invalid submission", { status: 400 })
        }

        const test = await db.test.findUnique({
            where: { id: testId },
            include: { questions: true, batches: { select: { id: true } } }
        })
        if (!test) return new NextResponse("Test not found", { status: 404 })

        const now = new Date()
        // Allow a short grace period past the end time so an auto-submit at the deadline still lands.
        const denied = await studentAccessError(
            { ...test, endTime: test.endTime ? new Date(test.endTime.getTime() + SUBMIT_GRACE_MS) : null },
            userId,
            now
        )
        if (denied) return new NextResponse(denied.message, { status: denied.status })

        const attempt = await db.testAttempt.findUnique({
            where: { testId_userId: { testId, userId } }
        })
        if (!attempt) return new NextResponse("Open the test before submitting", { status: 400 })
        if (attempt.submittedAt) return new NextResponse("You have already submitted this test", { status: 409 })

        const deadline = attemptDeadline(attempt.startedAt, test)
        if (deadline && now.getTime() > deadline.getTime() + SUBMIT_GRACE_MS) {
            return new NextResponse("Time limit exceeded", { status: 403 })
        }

        const { score, total } = gradeTest(test.questions, responses)

        // Mark the attempt submitted and save the result together. The submittedAt
        // check inside the transaction stops a double-click from saving two results.
        const result = await db.$transaction(async tx => {
            const claimed = await tx.testAttempt.updateMany({
                where: { id: attempt.id, submittedAt: null },
                data: { submittedAt: now }
            })
            if (claimed.count === 0) return null

            return tx.testResult.create({
                data: {
                    testId,
                    userId,
                    score,
                    total,
                    answers: JSON.stringify(responses),
                    completedAt: now
                }
            })
        })
        if (!result) return new NextResponse("You have already submitted this test", { status: 409 })

        // In MANUAL mode the score stays hidden until staff release it.
        if (test.resultMode === "MANUAL") {
            return NextResponse.json({ id: result.id, resultMode: test.resultMode })
        }
        return NextResponse.json({ id: result.id, score, total, resultMode: test.resultMode })
    } catch (error) {
        console.error("Submit Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
