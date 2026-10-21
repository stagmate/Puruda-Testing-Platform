import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF, ADMIN_ONLY } from "@/lib/api-auth"

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const courses = await db.course.findMany({
        include: { batches: true }
    })
    return NextResponse.json(courses)
}

export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    try {
        const { name } = await req.json()
        if (!name || typeof name !== "string") return new NextResponse("Name is required", { status: 400 })
        const course = await db.course.create({ data: { name: name.trim() } })
        return NextResponse.json(course)
    } catch (error) {
        console.error("[COURSES_POST]", error)
        return new NextResponse("Error creating course", { status: 500 })
    }
}
