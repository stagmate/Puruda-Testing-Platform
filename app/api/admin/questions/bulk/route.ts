import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { requireRole, STAFF } from "@/lib/api-auth"
import { isDifficulty, isQuestionType } from "@/lib/question-enums"

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { questions } = body
        const context = body.context || {}

        if (!Array.isArray(questions) || questions.length === 0) {
            return new NextResponse("Invalid questions array", { status: 400 })
        }

        // Validate minimal fields
        for (const q of questions) {
            if (!q || !q.text || !q.correct) {
                return new NextResponse("Invalid question format in CSV. Text and Correct Answer are required.", { status: 400 })
            }
            if (q.type && !isQuestionType(String(q.type).toUpperCase())) {
                return new NextResponse(`Invalid question type "${q.type}". Use SINGLE, MULTIPLE or INTEGER.`, { status: 400 })
            }
            if (q.difficulty && !isDifficulty(String(q.difficulty).toUpperCase())) {
                return new NextResponse(`Invalid difficulty "${q.difficulty}". Use BEGINNER, INTERMEDIATE or ADVANCED.`, { status: 400 })
            }
        }

        // Bulk Insert
        // Transform incoming simple CSV data to Prisma Schema compatible objects
        const formattedQuestions = questions.map((q): Prisma.QuestionCreateManyInput => ({
            text: q.text,
            options: JSON.stringify([q.optionA || "", q.optionB || "", q.optionC || "", q.optionD || ""]), // Ensure 4 options exist even if empty
            // Stored as given (text, letter or index); lib/grading.ts understands all of these.
            correct: Array.isArray(q.correct) ? JSON.stringify(q.correct) : String(q.correct),
            type: q.type ? String(q.type).toUpperCase() as Prisma.QuestionCreateManyInput["type"] : "SINGLE",
            difficulty: q.difficulty ? String(q.difficulty).toUpperCase() as Prisma.QuestionCreateManyInput["difficulty"] : "INTERMEDIATE",

            // Context from the UI selection
            courseId: context.courseId || null,
            subjectId: context.subjectId || null,
            chapterId: context.chapterId || null,
            subtopicId: context.subtopicId || null,

            // AI/Extra Fields
            solution: q.solution || null,
            examTag: q.examTag || null,
            hasDiagram: !!q.hasDiagram,
        }))

        // createMany is faster
        const result = await db.question.createMany({
            data: formattedQuestions
        })

        return NextResponse.json({ success: true, count: result.count })

    } catch (error) {
        console.error("Bulk Upload Error:", error)
        return new NextResponse("Internal Server Error during Bulk Upload", { status: 500 })
    }
}
