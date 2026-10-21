import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { requireRole, STAFF } from "@/lib/api-auth"
import { isDifficulty, isQuestionType } from "@/lib/question-enums"

// GET: Fetch questions with optional filters
export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")
    const batchId = searchParams.get("batchId")
    const subjectId = searchParams.get("subjectId")
    const chapterId = searchParams.get("chapterId")
    const subtopicId = searchParams.get("subtopicId")
    const difficulty = searchParams.get("difficulty")

    const where: Prisma.QuestionWhereInput = {}
    if (courseId) where.courseId = courseId
    if (batchId) where.batchId = batchId
    if (subjectId) where.subjectId = subjectId
    if (chapterId) where.chapterId = chapterId
    if (subtopicId) where.subtopicId = subtopicId
    if (difficulty && isDifficulty(difficulty)) where.difficulty = difficulty

    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50))
    const skip = (page - 1) * limit

    const [questions, total] = await Promise.all([
        db.question.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                subject: { select: { name: true } },
                chapter: { select: { name: true } },
                subtopic: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        db.question.count({ where })
    ])

    return NextResponse.json({
        data: questions,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    })
}

// POST: Create a single question
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { text, options, correct, courseId, batchId, subjectId, chapterId, subtopicId, difficulty, type, imageUrl, optionImages } = body

        if (!text || !correct || (Array.isArray(correct) && correct.length === 0)) {
            return new NextResponse("Missing fields", { status: 400 })
        }
        if (type !== undefined && !isQuestionType(type)) {
            return new NextResponse("Invalid question type", { status: 400 })
        }
        if (difficulty !== undefined && difficulty !== "" && !isDifficulty(difficulty)) {
            return new NextResponse("Invalid difficulty", { status: 400 })
        }

        // Validate options based on type
        let validOptions = options;
        if (type === "INTEGER") {
            validOptions = []; // Integer questions don't need options
        } else {
            if (!Array.isArray(options) || options.filter((o: unknown) => String(o ?? "").trim()).length < 2) {
                return new NextResponse("At least 2 options required", { status: 400 })
            }
        }

        const question = await db.question.create({
            data: {
                text,
                imageUrl: imageUrl || null,
                options: JSON.stringify(validOptions),
                optionAImageUrl: optionImages?.[0] || null,
                optionBImageUrl: optionImages?.[1] || null,
                optionCImageUrl: optionImages?.[2] || null,
                optionDImageUrl: optionImages?.[3] || null,
                correct: typeof correct === 'object' ? JSON.stringify(correct) : correct, // Handle array for MULTIPLE
                courseId: courseId || null,
                batchId: batchId || null,
                subjectId: subjectId || null,
                chapterId: chapterId || null,
                subtopicId: subtopicId || null,
                difficulty: difficulty || "INTERMEDIATE",
                type: type || "SINGLE"
            }
        })
        return NextResponse.json(question)
    } catch (error) {
        console.error(error)
        return new NextResponse("Error creating question", { status: 500 })
    }
}
