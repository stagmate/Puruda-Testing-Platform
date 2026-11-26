import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { normalizeQuestion } from "@/lib/question-input"
import { cleanContext, type QuestionContext } from "@/lib/question-context"
import { cleanExamTag, resolveContext } from "@/lib/question-context-server"

type Params = { params: Promise<{ id: string }> }

const CONTEXT_KEYS = ["subjectId", "chapterId", "subtopicId", "courseId", "batchId"] as const

// PATCH: replace a question's content (text, options, images, answer, solution,
// difficulty) and, when sent, its subject / chapter / subtopic / course / batch
// and exam tag.
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { id } = await params
    try {
        const body = await req.json()
        const { fields, error } = normalizeQuestion(body)
        if (error || !fields) return new NextResponse(error, { status: 400 })

        const data: Prisma.QuestionUncheckedUpdateInput = { ...fields }
        if (CONTEXT_KEYS.some(k => k in body)) {
            const current = await db.question.findUnique({ where: { id }, select: { subjectId: true, chapterId: true, subtopicId: true, courseId: true, batchId: true } })
            if (!current) return new NextResponse("Question not found", { status: 404 })
            // Keys that weren't sent keep their current value.
            const sent = cleanContext(body)
            const merged = Object.fromEntries(CONTEXT_KEYS.map(k => [k, k in body ? sent[k] : current[k]])) as QuestionContext
            const { context, error: contextError } = await resolveContext(merged)
            if (contextError || !context) return new NextResponse(contextError, { status: 400 })
            if (!context.subjectId) return new NextResponse("Choose a subject", { status: 400 })
            Object.assign(data, context)
        }
        if ("examTag" in body) data.examTag = cleanExamTag(body.examTag)

        const question = await db.question.update({ where: { id }, data })
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
