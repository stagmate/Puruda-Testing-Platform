import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    const batches = await db.batch.findMany({
        include: { course: true }
    })
    return NextResponse.json(batches)
}

export async function POST(req: Request) {
    try {
        const { name, courseId } = await req.json()
        const batch = await db.batch.create({
            data: { name, courseId }
        })
        return NextResponse.json(batch)
    } catch (error) {
        return new NextResponse("Error creating batch", { status: 500 })
    }
}
