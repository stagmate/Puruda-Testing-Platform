import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { courseId, subjectIds, count = 20, batchIds } = body

        if (!subjectIds || subjectIds.length === 0) {
            return new NextResponse("Subject IDs required", { status: 400 })
        }

        // 1. Fetch eligible questions
        const questions = await db.question.findMany({
            where: {
                subjectId: { in: subjectIds },
                // Optional: Filter by course if specified, but usually subjects are enough
                // courseId: courseId 
            },
            select: { id: true, subjectId: true }
        })

        if (questions.length < count) {
            return new NextResponse(`Not enough questions. Found ${questions.length}, requested ${count}`, { status: 400 })
        }

        // 2. Random Selection "AI" Logic
        // Shuffle array
        const shuffled = questions.sort(() => 0.5 - Math.random())
        const selected = shuffled.slice(0, count)

        // 3. Return selected IDs (UI will then submit them to create Test)
        return NextResponse.json({
            count: selected.length,
            questions: selected
        })

    } catch (error) {
        console.error(error)
        return new NextResponse("Error generating test", { status: 500 })
    }
}
