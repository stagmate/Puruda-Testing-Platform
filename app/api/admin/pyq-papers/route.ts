import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { attachByTag, defaultTitle, paperSummary, readPaper } from "@/lib/pyq-papers"

// Every PYQ paper, newest year first, with question counts by subject.
export async function GET() {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const [papers, bySubject] = await Promise.all([
        db.pyqPaper.findMany({ select: paperSummary, orderBy: [{ year: "desc" }, { exam: "asc" }, { session: "asc" }] }),
        db.question.groupBy({ by: ["pyqPaperId", "subjectId"], where: { pyqPaperId: { not: null } }, _count: true }),
    ])
    const subjects = await db.subject.findMany({ select: { id: true, name: true } })
    const name = new Map(subjects.map(s => [s.id, s.name]))
    return NextResponse.json(papers.map(p => ({
        ...p,
        subjects: bySubject.filter(r => r.pyqPaperId === p.id).map(r => ({ subject: (r.subjectId && name.get(r.subjectId)) || "No subject", count: r._count })),
    })))
}

// Create a paper; optionally file every question with an exam tag under it.
export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return new NextResponse("Invalid request", { status: 400 })
    const { data, error } = readPaper(body, false)
    if (error || !data) return new NextResponse(error, { status: 400 })
    const fields = data as Required<Pick<typeof data, "exam" | "year" | "session" | "duration" | "markingScheme">> & { title?: string }
    try {
        const paper = await db.pyqPaper.create({ data: { ...fields, title: fields.title || defaultTitle(fields) } })
        const attached = typeof body.examTag === "string" && body.examTag ? await attachByTag(paper.id, body.examTag) : 0
        return NextResponse.json({ ...paper, attached })
    } catch (e) {
        console.error("[PYQ_PAPERS_POST]", e)
        return new NextResponse("Couldn't create the paper", { status: 500 })
    }
}
