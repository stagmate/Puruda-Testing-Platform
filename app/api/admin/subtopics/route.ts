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

export async function POST(req: Request) {
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
