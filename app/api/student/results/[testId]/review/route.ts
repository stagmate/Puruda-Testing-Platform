import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { describeScheme, parseScheme } from "@/lib/marking"
import { orderTestQuestions } from "@/lib/test-order"
import { resultsVisible } from "@/lib/result-visibility"
import { finalizeExpiredAttempts } from "@/lib/finalize-attempts"
import { parseAnswers, subjectBreakdown } from "@/lib/result-breakdown"
import { answersRevealed, buildReview } from "@/lib/answer-review"

type Params = { params: Promise<{ testId: string }> }

// The logged-in student's question-by-question review of a submitted test.
// Marks follow the test's result mode (hidden until released for manual
// tests). Correct answers and solutions appear once the test has closed, so
// they can't be passed to students still taking it.
export async function GET(_req: Request, { params }: Params) {
    const auth = await requireRole(["STUDENT"])
    if (auth.response) return auth.response
    const { testId } = await params
    await finalizeExpiredAttempts({ userId: auth.user.id })

    const result = await db.testResult.findFirst({
        where: { testId, userId: auth.user.id },
        orderBy: { completedAt: "desc" },
        include: {
            test: {
                select: {
                    title: true, resultMode: true, resultsReleasedAt: true, endTime: true, markingScheme: true, questionOrder: true,
                    questions: {
                        select: {
                            id: true, type: true, text: true, options: true, correct: true, solution: true, createdAt: true,
                            imageUrl: true, optionAImageUrl: true, optionBImageUrl: true, optionCImageUrl: true, optionDImageUrl: true,
                            subject: { select: { name: true } }, chapter: { select: { name: true } },
                        },
                    },
                },
            },
        },
    })
    if (!result) return new NextResponse("You haven't submitted this test", { status: 404 })

    const { test } = result
    if (!resultsVisible(test)) {
        return NextResponse.json({ title: test.title, released: false })
    }

    const scheme = parseScheme(test.markingScheme)
    const questions = orderTestQuestions(test.questions, test.questionOrder)
    const answers = parseAnswers(result.answers)
    const revealed = answersRevealed(test)

    return NextResponse.json({
        title: test.title,
        released: true,
        completedAt: result.completedAt,
        score: result.score,
        total: result.total,
        marking: describeScheme(scheme),
        answersRevealed: revealed,
        revealAt: revealed ? null : test.endTime,
        subjects: subjectBreakdown(questions, answers, scheme),
        questions: buildReview(questions, answers, scheme, revealed),
    })
}
