import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

type Params = { params: Promise<{ id: string }> }

// Rename a course
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const name = cleanName((await req.json().catch(() => null))?.name)
    if (!name) return new NextResponse("Name is required", { status: 400 })
    try {
        return NextResponse.json(await db.course.update({ where: { id }, data: { name } }))
    } catch (error) {
        return dbErrorResponse(error, "course", "COURSE_PATCH")
    }
}

// Delete a course. Its batches must be moved or deleted first; tests and
// questions tagged with it keep existing, without the course tag.
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const batches = await db.batch.count({ where: { courseId: id } })
    if (batches > 0) {
        return new NextResponse(`This course still has ${batches} batch${batches === 1 ? "" : "es"}. Delete or move them first.`, { status: 409 })
    }
    try {
        await db.$transaction([
            db.test.updateMany({ where: { courseId: id }, data: { courseId: null } }),
            db.question.updateMany({ where: { courseId: id }, data: { courseId: null } }),
            db.course.delete({ where: { id } }),
        ])
        return NextResponse.json({ success: true })
    } catch (error) {
        return dbErrorResponse(error, "course", "COURSE_DELETE")
    }
}
