import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { isDifficulty, isQuestionType } from "@/lib/question-enums"
import { normalizeQuestion } from "@/lib/question-input"
import { cleanContext } from "@/lib/question-context"

// GET: questions with optional filters, newest first
export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const ctx = cleanContext(Object.fromEntries(searchParams))
    const difficulty = searchParams.get("difficulty")
    const type = searchParams.get("type")
    const search = searchParams.get("search")?.trim()

    const where: Prisma.QuestionWhereInput = {}
    if (ctx.courseId) where.courseId = ctx.courseId
    if (ctx.batchId) where.batchId = ctx.batchId
    if (ctx.subjectId) where.subjectId = ctx.subjectId
    if (ctx.chapterId) where.chapterId = ctx.chapterId
    if (ctx.subtopicId) where.subtopicId = ctx.subtopicId
    if (difficulty && isDifficulty(difficulty)) where.difficulty = difficulty
    if (type && isQuestionType(type)) where.type = type
    if (search) where.text = { contains: search, mode: "insensitive" }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50))

    const [questions, total] = await Promise.all([
        db.question.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                subject: { select: { name: true } },
                chapter: { select: { name: true } },
                subtopic: { select: { name: true } },
                _count: { select: { tests: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.question.count({ where }),
    ])

    return NextResponse.json({
        data: questions,
        meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
}

// POST: create one question
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { fields, error } = normalizeQuestion(body)
        if (error || !fields) return new NextResponse(error, { status: 400 })

        const question = await db.question.create({ data: { ...fields, ...cleanContext(body) } })
        return NextResponse.json(question)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return new NextResponse("The selected course, subject, chapter or subtopic no longer exists", { status: 400 })
        }
        console.error("[QUESTIONS_POST]", error)
        return new NextResponse("Error creating question", { status: 500 })
    }
}
