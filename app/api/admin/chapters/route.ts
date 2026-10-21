import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"

export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    if (!subjectId) return NextResponse.json([])

    const chapters = await db.chapter.findMany({
        where: { subjectId },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json(chapters)
}

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const { name, subjectId } = await req.json()
        if (!name || !subjectId) return new NextResponse("Missing fields", { status: 400 })

        const chapter = await db.chapter.create({
            data: { name, subjectId }
        })
        return NextResponse.json(chapter)
    } catch (error) {
        return new NextResponse("Error creating chapter", { status: 500 })
    }
}
