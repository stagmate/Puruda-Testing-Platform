import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    const courses = await db.course.findMany({
        include: { batches: true }
    })
    return NextResponse.json(courses)
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json()
        const course = await db.course.create({ data: { name } })
        return NextResponse.json(course)
    } catch (error) {
        return new NextResponse("Error creating course", { status: 500 })
    }
}
