import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"

// Accepts rows from the simple CSV format: subject, question, options ("A|B|C|D"), correct
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { questions } = body

        if (!questions || !Array.isArray(questions)) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const rows = questions.filter((q: any) => q && q.question && q.correct)
        if (rows.length === 0) {
            return new NextResponse("No valid rows: each needs a question and a correct answer", { status: 400 })
        }

        // Question.subject is a relation, so look up (or create) each subject by name.
        const subjectIds = new Map<string, string>()
        for (const name of new Set(rows.map((q: any) => String(q.subject || "General").trim()))) {
            const subject = await db.subject.upsert({ where: { name }, update: {}, create: { name } })
            subjectIds.set(name, subject.id)
        }

        const created = await db.question.createMany({
            data: rows.map((q: any) => ({
                subjectId: subjectIds.get(String(q.subject || "General").trim()),
                text: String(q.question),
                options: JSON.stringify(
                    Array.isArray(q.options) ? q.options : String(q.options || "").split("|").map((o: string) => o.trim()).filter(Boolean)
                ),
                correct: String(q.correct).trim(),
            }))
        })

        return NextResponse.json({ count: created.count })
    } catch (error) {
        console.error("[QUESTIONS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
