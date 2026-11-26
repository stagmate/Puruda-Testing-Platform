import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { dbErrorResponse } from "@/lib/api-errors"

type Params = { params: Promise<{ id: string }> }

// Change the teacher, batch or subject of an assignment
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const body = await req.json().catch(() => null)
    const data: { teacherId?: string; batchId?: string; subjectId?: string } = {}
    for (const key of ["teacherId", "batchId", "subjectId"] as const) {
        if (body?.[key] === undefined) continue
        if (typeof body[key] !== "string" || !body[key]) return new NextResponse("Choose a teacher, batch and subject", { status: 400 })
        data[key] = body[key]
    }
    try {
        return NextResponse.json(await db.teacherAssignment.update({ where: { id }, data }))
    } catch (error) {
        return dbErrorResponse(error, "teacher assignment", "ASSIGNMENT_PATCH", "This teacher is already assigned to that batch and subject")
    }
}

export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    try {
        await db.teacherAssignment.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        return dbErrorResponse(error, "teacher assignment", "ASSIGNMENT_DELETE")
    }
}
