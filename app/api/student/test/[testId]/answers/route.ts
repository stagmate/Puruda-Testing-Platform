import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { attemptDeadline, studentAccessError, SUBMIT_GRACE_MS } from "@/lib/test-access"
import { cleanAnswers, cleanVisited } from "@/lib/saved-answers"

const MAX_BODY = 200_000

// Autosave: store the student's answers so far on their open attempt.
// Sent as a normal request while the test is open, and with keepalive when the
// tab is hidden or closed.
export async function POST(req: Request, { params }: { params: Promise<{ testId: string }> }) {
    const auth = await requireRole(["STUDENT"])
    if (auth.response) return auth.response
    const { testId } = await params

    const raw = await req.text().catch(() => "")
    if (!raw || raw.length > MAX_BODY) return new NextResponse("Invalid answers", { status: 400 })
    let body: { answers?: unknown; visited?: unknown }
    try { body = JSON.parse(raw) } catch { return new NextResponse("Invalid answers", { status: 400 }) }

    const test = await db.test.findUnique({
        where: { id: testId },
        select: { isPublished: true, startTime: true, endTime: true, duration: true, batches: { select: { id: true } }, questions: { select: { id: true } } },
    })
    if (!test) return new NextResponse("Test not found", { status: 404 })

    const now = new Date()
    const denied = await studentAccessError({ ...test, endTime: test.endTime ? new Date(test.endTime.getTime() + SUBMIT_GRACE_MS) : null }, auth.user.id, now)
    if (denied) return new NextResponse(denied.message, { status: denied.status })

    const attempt = await db.testAttempt.findUnique({ where: { testId_userId: { testId, userId: auth.user.id } } })
    if (!attempt) return new NextResponse("Open the test first", { status: 400 })
    if (attempt.submittedAt) return new NextResponse("You have already submitted this test", { status: 409 })
    const deadline = attemptDeadline(attempt.startedAt, test)
    if (deadline && now.getTime() > deadline.getTime() + SUBMIT_GRACE_MS) return new NextResponse("Time is up", { status: 403 })

    const answers = cleanAnswers(body.answers, new Set(test.questions.map(q => q.id)))
    const visited = cleanVisited(body.visited, test.questions.length)
    const saved = await db.testAttempt.updateMany({
        where: { id: attempt.id, submittedAt: null },
        data: { answers: JSON.stringify(answers), visited: JSON.stringify(visited), answersSavedAt: now },
    })
    if (saved.count === 0) return new NextResponse("You have already submitted this test", { status: 409 })
    return NextResponse.json({ savedAt: now })
}
