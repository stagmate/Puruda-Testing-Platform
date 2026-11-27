import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, LEARNER_ONLY } from "@/lib/api-auth"
import { cleanAnswers, ownAttempt, questionForReview } from "@/lib/practice-server"
import { parseIds } from "@/lib/pyq"
import { parseAnswers } from "@/lib/result-breakdown"
import { parseScheme, questionMarks } from "@/lib/marking"
import { correctOptionIndexes, formatCorrectAnswer, isAnswerCorrect } from "@/lib/grading"

type Params = { params: Promise<{ id: string }> }

// Practice mode: check one answer. It is saved and locked, and the correct
// answer and solution come back. Body: { questionId, answer }
export async function POST(req: Request, { params }: Params) {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const a = await ownAttempt(id, auth.user.id)
    if (!a) return new NextResponse("Attempt not found", { status: 404 })
    if (a.mode !== "PRACTICE") return new NextResponse("Answers are shown after the test in test mode", { status: 400 })
    if (a.submittedAt) return new NextResponse("Already submitted", { status: 409 })

    const body = await req.json().catch(() => null)
    const questionId = typeof body?.questionId === "string" ? body.questionId : ""
    const ids = new Set(parseIds(a.questionIds))
    if (!ids.has(questionId)) return new NextResponse("Question not in this set", { status: 400 })
    const answer = cleanAnswers({ [questionId]: body?.answer }, ids)[questionId]
    if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
        return new NextResponse("Choose an answer first", { status: 400 })
    }

    const q = await db.question.findUnique({ where: { id: questionId }, select: questionForReview })
    if (!q) return new NextResponse("Question not found", { status: 404 })
    const checked = new Set(parseIds(a.checked))
    const answers = parseAnswers(a.answers)
    // Already checked: return the first answer's result (it's locked).
    const final = checked.has(questionId) ? answers[questionId] : answer
    if (!checked.has(questionId)) {
        answers[questionId] = answer
        checked.add(questionId)
        await db.practiceAttempt.update({ where: { id }, data: { answers: JSON.stringify(answers), checked: JSON.stringify([...checked]) } })
    }
    const scheme = parseScheme(a.markingScheme)
    const marks = questionMarks(q, final, scheme)
    return NextResponse.json({
        answer: final,
        status: isAnswerCorrect(q, final) ? "correct" : marks > 0 ? "partial" : "wrong",
        marks,
        correct: correctOptionIndexes(q),
        correctText: formatCorrectAnswer(q),
        solution: q.solution ?? null,
    })
}
