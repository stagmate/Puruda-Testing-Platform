import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { title, duration, type, courseId, batchIds, questionIds, startTime, endTime, resultMode, showRank } = body

        if (!title || !questionIds || questionIds.length === 0) {
            return new NextResponse("Missing title or questions", { status: 400 })
        }

        const test = await db.test.create({
            data: {
                title,
                duration: parseInt(duration),
                type,
                courseId,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                resultMode: resultMode || "INSTANT",
                showRank: showRank || false,
                batches: {
                    connect: batchIds.map((id: string) => ({ id }))
                },
                questions: {
                    connect: questionIds.map((id: string) => ({ id }))
                }
            }
        })

        return NextResponse.json(test)
    } catch (error) {
        console.error(error)
        return new NextResponse("Error creating test", { status: 500 })
    }
}

export async function GET(req: Request) {
    const tests = await db.test.findMany({
        include: {
            batches: { select: { name: true } },
            course: { select: { name: true } },
            _count: { select: { questions: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(tests)
}
