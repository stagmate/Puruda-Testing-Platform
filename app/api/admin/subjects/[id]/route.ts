import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const name = cleanName((await req.json().catch(() => null))?.name)
    if (!name) return new NextResponse("Name is required", { status: 400 })
    try {
        return NextResponse.json(await db.subject.update({ where: { id }, data: { name } }))
    } catch (error) {
        return dbErrorResponse(error, "subject", "SUBJECT_PATCH")
    }
}

// Delete a subject that no question uses, with its chapters, subtopics and
// teacher assignments.
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const questions = await db.question.count({
        where: { OR: [{ subjectId: id }, { chapter: { subjectId: id } }, { subtopic: { chapter: { subjectId: id } } }] },
    })
    if (questions > 0) {
        return new NextResponse(`${questions} question${questions === 1 ? " uses" : "s use"} this subject. Move or delete them in the Question Bank first.`, { status: 409 })
    }
    try {
        await db.$transaction([
            db.subtopic.deleteMany({ where: { chapter: { subjectId: id } } }),
            db.chapter.deleteMany({ where: { subjectId: id } }),
            db.teacherAssignment.deleteMany({ where: { subjectId: id } }),
            db.subject.delete({ where: { id } }),
        ])
        return NextResponse.json({ success: true })
    } catch (error) {
        return dbErrorResponse(error, "subject", "SUBJECT_DELETE")
    }
}
