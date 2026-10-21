import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF, ADMIN_ONLY } from "@/lib/api-auth"

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const batches = await db.batch.findMany({
        include: { course: true }
    })
    return NextResponse.json(batches)
}

export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    try {
        const { name, courseId } = await req.json()
        if (!name || !courseId) return new NextResponse("Name and course are required", { status: 400 })
        const batch = await db.batch.create({
            data: { name, courseId }
        })
        return NextResponse.json(batch)
    } catch (error) {
        console.error("[BATCHES_POST]", error)
        return new NextResponse("Error creating batch", { status: 500 })
    }
}
