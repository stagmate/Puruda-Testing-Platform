import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const subjects = await db.subject.findMany({
        include: { _count: { select: { chapters: true, questions: true } } },
        orderBy: { name: "asc" },
    })
    return NextResponse.json(subjects)
}

export async function POST(req: Request) {
    // Teachers can add subjects from the question bank.
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const name = cleanName((await req.json().catch(() => null))?.name)
    if (!name) return new NextResponse("Name is required", { status: 400 })
    try {
        return NextResponse.json(await db.subject.create({ data: { name } }))
    } catch (error) {
        return dbErrorResponse(error, "subject", "SUBJECTS_POST")
    }
}
