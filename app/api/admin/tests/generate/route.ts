import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { isDifficulty, isQuestionType } from "@/lib/question-enums"
import { pickQuestions } from "@/lib/question-pick"

const MAX = 300

// Pick questions at random from the chosen subjects for staff to review before
// the test is created. Nothing is saved here.
// Body: { subjectIds, count, difficulty?, type?, even?, excludeIds? }
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const body = await req.json().catch(() => null)
    const subjectIds: unknown = body?.subjectIds
    const count = parseInt(body?.count ?? 20)
    if (!Number.isFinite(count) || count <= 0 || count > MAX) {
        return new NextResponse(`Number of questions must be between 1 and ${MAX}`, { status: 400 })
    }
    if (!Array.isArray(subjectIds) || subjectIds.length === 0 || subjectIds.some(s => typeof s !== "string")) {
        return new NextResponse("Choose at least one subject", { status: 400 })
    }
    const exclude = Array.isArray(body?.excludeIds) ? body.excludeIds.filter((s: unknown): s is string => typeof s === "string") : []

    const where: Prisma.QuestionWhereInput = { subjectId: { in: subjectIds as string[] } }
    if (exclude.length) where.id = { notIn: exclude }
    if (isDifficulty(body?.difficulty)) where.difficulty = body.difficulty
    if (isQuestionType(body?.type)) where.type = body.type

    try {
        const pool = await db.question.findMany({ where, select: { id: true, subjectId: true } })
        const picked = pickQuestions(pool, count, subjectIds as string[], body?.even !== false)
        if (!picked) {
            return new NextResponse(`Only ${pool.length} matching question${pool.length === 1 ? " is" : "s are"} available, but you asked for ${count}.`, { status: 400 })
        }

        const full = await db.question.findMany({
            where: { id: { in: picked.map(q => q.id) } },
            include: {
                subject: { select: { name: true } },
                chapter: { select: { name: true } },
                subtopic: { select: { name: true } },
                course: { select: { name: true } },
                batch: { select: { name: true } },
                _count: { select: { tests: true } },
            },
        })
        const byId = new Map(full.map(q => [q.id, q]))
        const questions = picked.map(q => byId.get(q.id)).filter(Boolean)
        return NextResponse.json({ count: questions.length, available: pool.length, questions })
    } catch (error) {
        console.error("[TESTS_GENERATE]", error)
        return new NextResponse("Couldn't generate questions", { status: 500 })
    }
}
