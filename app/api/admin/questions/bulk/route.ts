import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { normalizeQuestion } from "@/lib/question-input"
import { cleanContext } from "@/lib/question-context"

const MAX_QUESTIONS = 500

// Save many questions at once (CSV upload, PDF import). All-or-nothing: if any
// row is invalid nothing is saved and the problems are listed.
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const body = await req.json()
        const { questions } = body
        const context = cleanContext(body.context)

        if (!Array.isArray(questions) || questions.length === 0) {
            return new NextResponse("No questions to save", { status: 400 })
        }
        if (questions.length > MAX_QUESTIONS) {
            return new NextResponse(`Too many questions at once (max ${MAX_QUESTIONS})`, { status: 400 })
        }

        const rows: Prisma.QuestionCreateManyInput[] = []
        // Rows share one insert, so give them distinct timestamps that keep the upload
        // order when the bank lists newest first (first row = newest).
        const now = Date.now()
        const problems: string[] = []
        questions.forEach((q: Record<string, unknown>, i: number) => {
            // CSV rows use optionA..optionD; editor/PDF rows use an options array
            const input = Array.isArray(q?.options) ? q : { ...q, options: [q?.optionA, q?.optionB, q?.optionC, q?.optionD] }
            const { fields, error } = normalizeQuestion(input ?? {})
            if (error || !fields) problems.push(`Question ${i + 1}: ${error}`)
            else rows.push({
                id: randomUUID(), // chosen here so the ids can be returned in upload order
                ...fields,
                ...context,
                // A question pack spans several subjects, so a row may name its own subject.
                ...(typeof q.subjectId === "string" && q.subjectId ? { subjectId: q.subjectId, chapterId: null, subtopicId: null } : {}),
                examTag: typeof q.examTag === "string" ? q.examTag.trim().slice(0, 200) || null : null,
                createdAt: new Date(now - i),
            })
        })

        if (problems.length > 0) {
            const shown = problems.slice(0, 10).join("\n")
            const more = problems.length > 10 ? `\n…and ${problems.length - 10} more` : ""
            return new NextResponse(`Nothing was saved. Fix these first:\n${shown}${more}`, { status: 400 })
        }

        const result = await db.question.createMany({ data: rows })
        return NextResponse.json({ success: true, count: result.count, ids: rows.map(r => r.id) })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return new NextResponse("The selected course, subject, chapter or subtopic no longer exists", { status: 400 })
        }
        console.error("Bulk Upload Error:", error)
        return new NextResponse("Internal Server Error during Bulk Upload", { status: 500 })
    }
}
