import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { questions } = body

        if (!questions || !Array.isArray(questions)) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        // Bulk create questions
        const created = await db.question.createMany({
            data: questions.map((q: any) => ({
                subject: q.subject || "General",
                text: q.question,
                options: JSON.stringify(q.options?.split("|") || []), // Expect "A|B|C|D" format in CSV for simplicity or parse array
                correct: q.correct,
            }))
        })

        return NextResponse.json({ count: created.count })
    } catch (error) {
        console.error("[QUESTIONS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
