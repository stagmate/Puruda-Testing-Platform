import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

type Params = { params: Promise<{ id: string }> }

// Rename a batch or move it to another course
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const body = await req.json().catch(() => null)
    const data: { name?: string; courseId?: string } = {}
    if (body?.name !== undefined) {
        const name = cleanName(body.name)
        if (!name) return new NextResponse("Name is required", { status: 400 })
        data.name = name
    }
    if (body?.courseId !== undefined) {
        if (typeof body.courseId !== "string" || !body.courseId) return new NextResponse("Choose a course", { status: 400 })
        data.courseId = body.courseId
    }
    try {
        return NextResponse.json(await db.batch.update({ where: { id }, data }))
    } catch (error) {
        return dbErrorResponse(error, "batch", "BATCH_PATCH")
    }
}

// Delete a batch. Students keep their accounts and results; teacher assignments
// for the batch are removed. A published test that was only for this batch is
// switched to draft, because a test with no batches is open to every student.
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    try {
        const result = await db.$transaction(async tx => {
            const tests = await tx.test.findMany({
                where: { batches: { some: { id } } },
                select: { id: true, isPublished: true, _count: { select: { batches: true } } },
            })
            const onlyThisBatch = tests.filter(t => t._count.batches === 1 && t.isPublished).map(t => t.id)
            if (onlyThisBatch.length) await tx.test.updateMany({ where: { id: { in: onlyThisBatch } }, data: { isPublished: false } })
            await tx.teacherAssignment.deleteMany({ where: { batchId: id } })
            await tx.question.updateMany({ where: { batchId: id }, data: { batchId: null } })
            await tx.batch.delete({ where: { id } })
            return { testsUnpublished: onlyThisBatch.length }
        })
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return dbErrorResponse(error, "batch", "BATCH_DELETE")
    }
}
