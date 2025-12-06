import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { questions, courseId, batchId, subjectId } = body

        // Expects questions: [{ text, options: [a,b,c,d], correct }]
        if (!Array.isArray(questions) || questions.length === 0) {
            return new NextResponse("No questions provided", { status: 400 })
        }

        // Create many
        await db.question.createMany({
            data: questions.map((q: any) => ({
                text: q.text,
                options: JSON.stringify(q.options),
                correct: q.correct,
                courseId,
                batchId,
                subjectId
            }))
        })

        return NextResponse.json({ success: true, count: questions.length })
    } catch (error) {
        console.error(error)
        return new NextResponse("Error processing bulk upload", { status: 500 })
    }
}
