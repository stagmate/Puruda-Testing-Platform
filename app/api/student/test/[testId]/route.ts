import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { parseOptions } from "@/lib/grading"
import { attemptDeadline, studentAccessError } from "@/lib/test-access"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ testId: string }> }
) {
    const auth = await requireRole(["STUDENT", "ADMIN", "TEACHER"])
    if (auth.response) return auth.response
    const user = auth.user

    try {
        const { testId } = await params
        if (!testId) return new NextResponse("Test ID is required", { status: 400 })

        const test = await db.test.findUnique({
            where: { id: testId },
            include: {
                batches: { select: { id: true } },
                // Only the fields a student needs: never the correct answer or solution.
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        imageUrl: true,
                        optionAImageUrl: true,
                        optionBImageUrl: true,
                        optionCImageUrl: true,
                        optionDImageUrl: true,
                    }
                }
            }
        })
        if (!test) return new NextResponse("Test not found", { status: 404 })

        let deadline: Date | null = null

        if (user.role === "STUDENT") {
            const denied = await studentAccessError(test, user.id)
            if (denied) return new NextResponse(denied.message, { status: denied.status })

            // Start the attempt on first open; reopening keeps the original start time.
            const attempt = await db.testAttempt.upsert({
                where: { testId_userId: { testId, userId: user.id } },
                create: { testId, userId: user.id },
                update: {}
            })
            if (attempt.submittedAt) {
                return new NextResponse("You have already submitted this test", { status: 409 })
            }
            deadline = attemptDeadline(attempt.startedAt, test)
            if (deadline && Date.now() > deadline.getTime()) {
                return new NextResponse("Your time for this test has run out", { status: 403 })
            }
        }

        return NextResponse.json({
            id: test.id,
            title: test.title,
            type: test.type,
            duration: test.duration,
            deadline,
            serverNow: new Date(),
            questions: test.questions.map(q => ({ ...q, options: parseOptions(q.options) }))
        })
    } catch (error) {
        console.error("[TEST_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
