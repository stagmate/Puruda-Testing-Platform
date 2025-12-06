import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    if (!subjectId) return NextResponse.json([])

    const chapters = await db.chapter.findMany({
        where: { subjectId },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json(chapters)
}
