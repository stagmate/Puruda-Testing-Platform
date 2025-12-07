import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        console.log("📥 Bulk Upload Request Started")
        const body = await req.json()
        const { questions, context } = body

        if (!Array.isArray(questions) || questions.length === 0) {
            return new NextResponse("Invalid questions array", { status: 400 })
        }

        // Validate minimal fields
        for (const q of questions) {
            if (!q.text || !q.correct) {
                return new NextResponse("Invalid question format in CSV. Text and Correct Answer are required.", { status: 400 })
            }
        }

        console.log(`Processing ${questions.length} questions for context:`, context)

        // Bulk Insert
        // Transform incoming simple CSV data to Prisma Schema compatible objects
        const formattedQuestions = questions.map(q => ({
            text: q.text,
            options: JSON.stringify([q.optionA || "", q.optionB || "", q.optionC || "", q.optionD || ""]), // Ensure 4 options exist even if empty
            correct: q.correct, // Assume CSV provides the correct string value or index
            type: q.type || "SINGLE", // Default to SINGLE
            difficulty: q.difficulty || "INTERMEDIATE",

            // Context from the UI selection
            courseId: context.courseId || null,
            subjectId: context.subjectId || null,
            chapterId: context.chapterId || null,
            subtopicId: context.subtopicId || null,

            // AI/Extra Fields
            solution: q.solution || null,
            examTag: q.examTag || null,
            hasDiagram: q.hasDiagram || false,
        }))

        // createMany is faster
        const result = await db.question.createMany({
            data: formattedQuestions
        })

        console.log("✅ Bulk Upload Success:", result)
        return NextResponse.json({ success: true, count: result.count })

    } catch (error) {
        console.error("Bulk Upload Error:", error)
        return new NextResponse("Internal Server Error during Bulk Upload", { status: 500 })
    }
}
