import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"

export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const chapterId = searchParams.get("chapterId")

    if (!chapterId) return NextResponse.json([])

    const subtopics = await db.subtopic.findMany({
        where: { chapterId },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json(subtopics)
}

export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const { name, chapterId } = await req.json()
        if (!name || !chapterId) return new NextResponse("Missing fields", { status: 400 })

        const subtopic = await db.subtopic.create({
            data: { name, chapterId }
        })
        return NextResponse.json(subtopic)
    } catch (error) {
        return new NextResponse("Error creating subtopic", { status: 500 })
    }
}
