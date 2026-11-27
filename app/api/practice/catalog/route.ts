import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, LEARNER_ONLY } from "@/lib/api-auth"
import { PUBLISHED_PYQ } from "@/lib/practice-server"
import { parseIds } from "@/lib/pyq"

// What a learner can practise: published papers, and chapters with PYQ counts,
// plus how much of each they have already attempted.
export async function GET() {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response

    const [papers, byChapter, subjects, chapters, attempts] = await Promise.all([
        db.pyqPaper.findMany({
            where: { isPublished: true },
            select: { id: true, exam: true, year: true, session: true, title: true, duration: true, _count: { select: { questions: true } } },
            orderBy: [{ year: "desc" }, { session: "asc" }],
        }),
        db.question.groupBy({ by: ["subjectId", "chapterId"], where: PUBLISHED_PYQ, _count: true }),
        db.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
        db.chapter.findMany({ select: { id: true, name: true, subjectId: true } }),
        db.practiceAttempt.findMany({
            where: { userId: auth.user.id },
            select: { id: true, kind: true, mode: true, title: true, paperId: true, questionIds: true, startedAt: true, submittedAt: true, score: true, total: true },
            orderBy: { startedAt: "desc" },
        }),
    ])

    const seen = new Set(attempts.filter(a => a.submittedAt).flatMap(a => parseIds(a.questionIds)))
    const seenByChapter = seen.size
        ? await db.question.groupBy({ by: ["chapterId"], where: { id: { in: [...seen] }, ...PUBLISHED_PYQ }, _count: true })
        : []
    const doneIn = new Map(seenByChapter.map(r => [r.chapterId, r._count]))
    const chapterName = new Map(chapters.map(c => [c.id, c]))

    const subjectRows = subjects.map(s => {
        const rows = byChapter.filter(r => r.subjectId === s.id)
        const list = rows
            .map(r => ({ id: r.chapterId, name: (r.chapterId && chapterName.get(r.chapterId)?.name) || "Other questions", questions: r._count, attempted: doneIn.get(r.chapterId) ?? 0 }))
            .sort((a, b) => b.questions - a.questions)
        return { id: s.id, name: s.name, questions: rows.reduce((n, r) => n + r._count, 0), chapters: list }
    }).filter(s => s.questions > 0)

    const best = (paperId: string) => {
        const done = attempts.filter(a => a.paperId === paperId && a.submittedAt && a.total)
        return done.length ? Math.max(...done.map(a => Math.round(((a.score ?? 0) / (a.total || 1)) * 100))) : null
    }

    return NextResponse.json({
        stats: {
            papers: papers.length,
            questions: subjectRows.reduce((n, s) => n + s.questions, 0),
            attempted: seen.size,
            tests: attempts.filter(a => a.submittedAt).length,
        },
        papers: papers.map(p => ({ ...p, questions: p._count.questions, bestPercent: best(p.id) })),
        subjects: subjectRows,
        recent: attempts.slice(0, 8).map(({ questionIds, ...a }) => ({ ...a, questions: parseIds(questionIds).length })),
    })
}
