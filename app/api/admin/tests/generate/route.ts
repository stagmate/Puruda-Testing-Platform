import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { subjectIds } = body
        const count = parseInt(body.count ?? 20)

        if (!Number.isFinite(count) || count <= 0) {
            return new NextResponse("Count must be a positive number", { status: 400 })
        }
        if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
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
        // Fisher-Yates shuffle (sorting with a random comparator is biased)
        const shuffled = [...questions]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
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
