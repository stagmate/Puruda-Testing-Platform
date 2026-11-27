import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"

// Exam tags in the question bank (set when papers are imported), with how many
// questions each has and how many are already in a PYQ paper.
export async function GET() {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const [all, filed] = await Promise.all([
        db.question.groupBy({ by: ["examTag"], where: { examTag: { not: null } }, _count: true, orderBy: { examTag: "asc" } }),
        db.question.groupBy({ by: ["examTag"], where: { examTag: { not: null }, pyqPaperId: { not: null } }, _count: true }),
    ])
    const inPapers = new Map(filed.map(r => [r.examTag, r._count]))
    return NextResponse.json(all.map(r => ({ tag: r.examTag, questions: r._count, inPapers: inPapers.get(r.examTag) ?? 0 })))
}
