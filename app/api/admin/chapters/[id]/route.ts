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
        return NextResponse.json(await db.chapter.update({ where: { id }, data: { name } }))
    } catch (error) {
        return dbErrorResponse(error, "chapter", "CHAPTER_PATCH")
    }
}

// Delete a chapter (and its subtopics) that no question uses.
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const questions = await db.question.count({ where: { OR: [{ chapterId: id }, { subtopic: { chapterId: id } }] } })
    if (questions > 0) {
        return new NextResponse(`${questions} question${questions === 1 ? " uses" : "s use"} this chapter. Move or delete them in the Question Bank first.`, { status: 409 })
    }
    try {
        await db.$transaction([
            db.subtopic.deleteMany({ where: { chapterId: id } }),
            db.chapter.delete({ where: { id } }),
        ])
        return NextResponse.json({ success: true })
    } catch (error) {
        return dbErrorResponse(error, "chapter", "CHAPTER_DELETE")
    }
}
