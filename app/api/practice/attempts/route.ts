import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, LEARNER_ONLY } from "@/lib/api-auth"
import { PUBLISHED_PYQ } from "@/lib/practice-server"
import { chapterTestMinutes, isPracticeMode, parseIds, pickChapterSet } from "@/lib/pyq"
import { orderTestQuestions } from "@/lib/test-order"
import { MARKING_PRESETS } from "@/lib/marking"

// The learner's attempts, newest first.
export async function GET() {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const attempts = await db.practiceAttempt.findMany({
        where: { userId: auth.user.id },
        select: { id: true, kind: true, mode: true, title: true, questionIds: true, startedAt: true, submittedAt: true, score: true, total: true },
        orderBy: { startedAt: "desc" },
    })
    return NextResponse.json(attempts.map(({ questionIds, ...a }) => ({ ...a, questions: parseIds(questionIds).length })))
}

// Start a mock. Body:
//   { kind: "PAPER", paperId, mode }                       full previous-year paper
//   { kind: "CHAPTER", chapterIds: [...], count, mode }    chapter-wise PYQ set
export async function POST(req: Request) {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const body = await req.json().catch(() => null)
    const mode = body?.mode
    if (!isPracticeMode(mode)) return new NextResponse("Choose practice or test mode", { status: 400 })

    if (body?.kind === "PAPER") {
        const paper = await db.pyqPaper.findFirst({
            where: { id: String(body.paperId ?? ""), isPublished: true },
            include: { questions: { select: { id: true, createdAt: true } } },
        })
        if (!paper || paper.questions.length === 0) return new NextResponse("Paper not found", { status: 404 })
        const ids = orderTestQuestions(paper.questions, paper.questionOrder).map(q => q.id)
        const attempt = await db.practiceAttempt.create({
            data: {
                userId: auth.user.id, kind: "PAPER", mode, title: paper.title, paperId: paper.id, questionIds: JSON.stringify(ids),
                duration: mode === "TEST" ? paper.duration : null,
                markingScheme: paper.markingScheme || JSON.stringify(MARKING_PRESETS.JEE_MAIN.scheme),
            },
        })
        return NextResponse.json({ id: attempt.id })
    }

    if (body?.kind === "CHAPTER") {
        const chapterIds = Array.isArray(body.chapterIds) ? body.chapterIds.filter((c: unknown): c is string => typeof c === "string").slice(0, 50) : []
        const count = Math.min(90, Math.max(1, parseInt(body.count) || 15))
        if (chapterIds.length === 0) return new NextResponse("Choose at least one chapter", { status: 400 })
        const pool = await db.question.findMany({ where: { chapterId: { in: chapterIds }, ...PUBLISHED_PYQ }, select: { id: true } })
        if (pool.length === 0) return new NextResponse("No previous-year questions in these chapters yet", { status: 404 })

        const done = await db.practiceAttempt.findMany({ where: { userId: auth.user.id, submittedAt: { not: null } }, select: { questionIds: true } })
        const seen = new Set(done.flatMap(a => parseIds(a.questionIds)))
        const ids = pickChapterSet(pool.map(q => q.id), seen, count)
        const names = await db.chapter.findMany({ where: { id: { in: chapterIds } }, select: { name: true, subject: { select: { name: true } } } })
        const title = names.length === 1
            ? `${names[0].subject.name}: ${names[0].name}`
            : `${[...new Set(names.map(n => n.subject.name))].join(", ")}: ${names.length} chapters`
        const attempt = await db.practiceAttempt.create({
            data: {
                userId: auth.user.id, kind: "CHAPTER", mode, title: `${title} (PYQs)`, questionIds: JSON.stringify(ids),
                duration: mode === "TEST" ? chapterTestMinutes(ids.length) : null,
                markingScheme: JSON.stringify(MARKING_PRESETS.JEE_MAIN.scheme),
            },
        })
        return NextResponse.json({ id: attempt.id })
    }

    return new NextResponse("Choose a paper or chapters", { status: 400 })
}
