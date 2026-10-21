import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"

const TEST_TYPES = ["SUBJECT", "MIXED", "MOCK"]
const RESULT_MODES = ["INSTANT", "MANUAL"]

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { title, duration, type, courseId, batchIds, questionIds, startTime, endTime, resultMode, showRank } = body

        if (!title || !Array.isArray(questionIds) || questionIds.length === 0) {
            return new NextResponse("Missing title or questions", { status: 400 })
        }

        const minutes = parseInt(duration)
        if (!Number.isFinite(minutes) || minutes <= 0) {
            return new NextResponse("Duration must be a positive number of minutes", { status: 400 })
        }

        const start = startTime ? new Date(startTime) : null
        const end = endTime ? new Date(endTime) : null
        if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
            return new NextResponse("Invalid start or end time", { status: 400 })
        }
        if (start && end && end <= start) {
            return new NextResponse("End time must be after start time", { status: 400 })
        }

        const test = await db.test.create({
            data: {
                title,
                duration: minutes,
                type: TEST_TYPES.includes(type) ? type : "MIXED",
                courseId: courseId || null,
                startTime: start,
                endTime: end,
                resultMode: RESULT_MODES.includes(resultMode) ? resultMode : "INSTANT",
                showRank: !!showRank,
                batches: {
                    connect: (Array.isArray(batchIds) ? batchIds : []).map((id: string) => ({ id }))
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

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

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
