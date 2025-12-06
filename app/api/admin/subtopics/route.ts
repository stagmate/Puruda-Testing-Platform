import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chapterId = searchParams.get("chapterId")

    if (!chapterId) return NextResponse.json([])

    const subtopics = await db.subtopic.findMany({
        where: { chapterId },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json(subtopics)
}
