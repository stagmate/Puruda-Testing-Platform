import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { attachByTag, defaultTitle, readPaper } from "@/lib/pyq-papers"
import { orderTestQuestions, encodeQuestionOrder } from "@/lib/test-order"
import { parseIds } from "@/lib/pyq"

type Params = { params: Promise<{ id: string }> }

// A paper with its questions in order (for preview).
export async function GET(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const paper = await db.pyqPaper.findUnique({
        where: { id },
        include: {
            questions: {
                include: {
                    subject: { select: { name: true } }, chapter: { select: { name: true } }, subtopic: { select: { name: true } },
                    course: { select: { name: true } }, batch: { select: { name: true } },
                },
            },
        },
    })
    if (!paper) return new NextResponse("Paper not found", { status: 404 })
    return NextResponse.json({ ...paper, questions: orderTestQuestions(paper.questions, paper.questionOrder) })
}

// Edit details, publish / unpublish, add questions by exam tag, or remove questions.
// Body: any of { exam, year, session, title, duration, marking, isPublished, examTag, removeQuestionIds }
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return new NextResponse("Invalid request", { status: 400 })
    const paper = await db.pyqPaper.findUnique({ where: { id } })
    if (!paper) return new NextResponse("Paper not found", { status: 404 })

    const { data, error } = readPaper(body, true)
    if (error || !data) return new NextResponse(error, { status: 400 })
    const update: Record<string, unknown> = { ...data }
    if (!data.title && (data.exam || data.year || data.session !== undefined) && body.title === undefined) {
        update.title = defaultTitle({ exam: data.exam ?? paper.exam, year: data.year ?? paper.year, session: data.session ?? paper.session })
    }
    if (typeof body.isPublished === "boolean") {
        if (body.isPublished && (await db.question.count({ where: { pyqPaperId: id } })) === 0) {
            return new NextResponse("Add questions to the paper before publishing it", { status: 400 })
        }
        update.isPublished = body.isPublished
    }

    try {
        if (Array.isArray(body.removeQuestionIds) && body.removeQuestionIds.length) {
            const remove = body.removeQuestionIds.filter((x: unknown): x is string => typeof x === "string")
            await db.question.updateMany({ where: { id: { in: remove }, pyqPaperId: id }, data: { pyqPaperId: null } })
            const keep = parseIds(paper.questionOrder).filter(q => !remove.includes(q))
            update.questionOrder = encodeQuestionOrder(keep)
        }
        if (Object.keys(update).length) await db.pyqPaper.update({ where: { id }, data: update })
        const attached = typeof body.examTag === "string" && body.examTag ? await attachByTag(id, body.examTag) : 0
        return NextResponse.json({ success: true, attached })
    } catch (e) {
        console.error("[PYQ_PAPER_PATCH]", e)
        return new NextResponse("Couldn't update the paper", { status: 500 })
    }
}

// Delete a paper. Its questions stay in the question bank; past attempts keep their scores.
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    try {
        await db.$transaction([
            db.question.updateMany({ where: { pyqPaperId: id }, data: { pyqPaperId: null } }),
            db.pyqPaper.delete({ where: { id } }),
        ])
        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("[PYQ_PAPER_DELETE]", e)
        return new NextResponse("Couldn't delete the paper", { status: 500 })
    }
}
