import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { normalizeQuestion } from "@/lib/question-input"

type Params = { params: Promise<{ id: string }> }

// PATCH: replace a question's content (text, options, images, answer, solution, difficulty)
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { id } = await params
    try {
        const body = await req.json()
        const { fields, error } = normalizeQuestion(body)
        if (error || !fields) return new NextResponse(error, { status: 400 })

        const question = await db.question.update({ where: { id }, data: fields })
        return NextResponse.json(question)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return new NextResponse("Question not found", { status: 404 })
        }
        console.error("[QUESTION_PATCH]", error)
        return new NextResponse("Error updating question", { status: 500 })
    }
}

// DELETE: remove a question that no test uses (deleting a used one would change past tests)
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { id } = await params
    const question = await db.question.findUnique({ where: { id }, select: { _count: { select: { tests: true } } } })
    if (!question) return new NextResponse("Question not found", { status: 404 })
    if (question._count.tests > 0) {
        return new NextResponse(`This question is used in ${question._count.tests} test(s) and can't be deleted`, { status: 409 })
    }

    await db.question.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
