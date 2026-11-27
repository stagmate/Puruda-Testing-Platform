import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, LEARNER_ONLY } from "@/lib/api-auth"
import { attemptQuestions, cleanAnswers, finishAttempt, ownAttempt } from "@/lib/practice-server"
import { parseIds, parseSeconds, practiceDeadline } from "@/lib/pyq"
import { parseAnswers, subjectBreakdown } from "@/lib/result-breakdown"
import { buildReview } from "@/lib/answer-review"
import { describeScheme, parseScheme, questionMarks } from "@/lib/marking"
import { correctOptionIndexes, formatCorrectAnswer, isAnswerCorrect } from "@/lib/grading"
import { isAnswered } from "@/lib/test-progress"

type Params = { params: Promise<{ id: string }> }

// An attempt. While open: the questions without answers (except ones already
// checked in practice mode). Once submitted: the full review with solutions.
export async function GET(_req: Request, { params }: Params) {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    let a = await ownAttempt(id, auth.user.id)
    if (!a) return new NextResponse("Attempt not found", { status: 404 })

    // Time ran out while away: close it with what was saved.
    const deadline = practiceDeadline(a)
    if (!a.submittedAt && deadline && Date.now() > deadline.getTime() + 60_000) a = (await finishAttempt(a.id, {}))!

    const questions = await attemptQuestions(a.questionIds)
    const answers = parseAnswers(a.answers)
    const scheme = parseScheme(a.markingScheme)
    const time = parseSeconds(a.timeSpent)
    const base = { id: a.id, title: a.title, kind: a.kind, mode: a.mode, startedAt: a.startedAt, marking: describeScheme(scheme) }

    if (a.submittedAt) {
        const review = buildReview(questions, answers, scheme, true).map(r => ({ ...r, seconds: time[r.id] ?? 0 }))
        const attempted = review.filter(r => r.status !== "unanswered").length
        const correct = review.filter(r => r.status === "correct").length
        return NextResponse.json({
            ...base,
            submitted: true,
            submittedAt: a.submittedAt,
            released: true,
            answersRevealed: true,
            score: a.score,
            total: a.total,
            accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
            attempted,
            totalSeconds: Object.values(time).reduce((n, s) => n + s, 0),
            subjects: subjectBreakdown(questions, answers, scheme),
            questions: review,
        })
    }

    const checked = new Set(parseIds(a.checked))
    return NextResponse.json({
        ...base,
        submitted: false,
        deadline: deadline?.toISOString() ?? null,
        serverNow: new Date().toISOString(),
        answers,
        timeSpent: time,
        questions: questions.map(q => {
            const out = {
                id: q.id, type: q.type, text: q.text, options: q.options ? JSON.parse(q.options) : [], imageUrl: q.imageUrl,
                optionAImageUrl: q.optionAImageUrl, optionBImageUrl: q.optionBImageUrl, optionCImageUrl: q.optionCImageUrl, optionDImageUrl: q.optionDImageUrl,
                subject: q.subject?.name ?? null, source: q.pyqPaper?.title ?? null,
            }
            if (!checked.has(q.id)) return out
            const ans = answers[q.id]
            return {
                ...out,
                feedback: {
                    status: !isAnswered(ans) ? "unanswered" : isAnswerCorrect(q, ans) ? "correct" : questionMarks(q, ans, scheme) > 0 ? "partial" : "wrong",
                    correct: correctOptionIndexes(q), correctText: formatCorrectAnswer(q), solution: q.solution ?? null,
                },
            }
        }),
    })
}

// Autosave answers and time spent. Answers already checked can't change.
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const a = await ownAttempt(id, auth.user.id)
    if (!a) return new NextResponse("Attempt not found", { status: 404 })
    if (a.submittedAt) return new NextResponse("Already submitted", { status: 409 })
    const deadline = practiceDeadline(a)
    if (deadline && Date.now() > deadline.getTime() + 60_000) return new NextResponse("Time is up", { status: 403 })

    const body = await req.json().catch(() => null)
    const ids = new Set(parseIds(a.questionIds))
    const saved = parseAnswers(a.answers)
    const checked = new Set(parseIds(a.checked))
    const answers = cleanAnswers(body?.answers, ids)
    for (const k of checked) { if (saved[k] !== undefined) answers[k] = saved[k]; else delete answers[k] }
    const time = { ...parseSeconds(a.timeSpent), ...parseSeconds(JSON.stringify(body?.timeSpent ?? {})) }
    await db.practiceAttempt.update({ where: { id }, data: { answers: JSON.stringify(answers), timeSpent: JSON.stringify(time) } })
    return NextResponse.json({ saved: true })
}
