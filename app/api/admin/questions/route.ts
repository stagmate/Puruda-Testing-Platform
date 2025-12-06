import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET: Fetch questions with optional filters
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")
    const batchId = searchParams.get("batchId")
    const subjectId = searchParams.get("subjectId")

    const where: any = {}
    if (courseId) where.courseId = courseId
    if (batchId) where.batchId = batchId
    if (subjectId) where.subjectId = subjectId

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const [questions, total] = await Promise.all([
        db.question.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                subject: { select: { name: true } }
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
    try {
        const body = await req.json()
        const { text, options, correct, courseId, batchId, subjectId, imageUrl, optionImages } = body

        if (!text || !options || !correct) {
            return new NextResponse("Missing fields", { status: 400 })
        }

        const question = await db.question.create({
            data: {
                text,
                imageUrl: imageUrl || null,
                options: JSON.stringify(options),
                optionAImageUrl: optionImages?.[0] || null,
                optionBImageUrl: optionImages?.[1] || null,
                optionCImageUrl: optionImages?.[2] || null,
                optionDImageUrl: optionImages?.[3] || null,
                correct,
                courseId,
                batchId,
                subjectId
            }
        })
        return NextResponse.json(question)
    } catch (error) {
        console.error(error)
        return new NextResponse("Error creating question", { status: 500 })
    }
}
