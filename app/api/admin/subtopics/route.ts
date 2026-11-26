import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const chapterId = new URL(req.url).searchParams.get("chapterId")
    if (!chapterId) return NextResponse.json([])

    const subtopics = await db.subtopic.findMany({
        where: { chapterId },
        include: { _count: { select: { questions: true } } },
        orderBy: { name: "asc" },
    })
    return NextResponse.json(subtopics)
}

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const body = await req.json().catch(() => null)
    const name = cleanName(body?.name)
    const chapterId = typeof body?.chapterId === "string" ? body.chapterId : ""
    if (!name || !chapterId) return new NextResponse("Name and chapter are required", { status: 400 })
    try {
        return NextResponse.json(await db.subtopic.create({ data: { name, chapterId } }))
    } catch (error) {
        return dbErrorResponse(error, "subtopic", "SUBTOPICS_POST")
    }
}
