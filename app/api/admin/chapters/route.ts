import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const subjectId = new URL(req.url).searchParams.get("subjectId")
    if (!subjectId) return NextResponse.json([])

    const chapters = await db.chapter.findMany({
        where: { subjectId },
        include: { _count: { select: { subtopics: true, questions: true } } },
        orderBy: { name: "asc" },
    })
    return NextResponse.json(chapters)
}

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const body = await req.json().catch(() => null)
    const name = cleanName(body?.name)
    const subjectId = typeof body?.subjectId === "string" ? body.subjectId : ""
    if (!name || !subjectId) return new NextResponse("Name and subject are required", { status: 400 })
    try {
        return NextResponse.json(await db.chapter.create({ data: { name, subjectId } }))
    } catch (error) {
        return dbErrorResponse(error, "chapter", "CHAPTERS_POST")
    }
}
