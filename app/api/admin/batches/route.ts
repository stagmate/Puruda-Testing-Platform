import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF, ADMIN_ONLY } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const batches = await db.batch.findMany({
        include: { course: true, _count: { select: { students: true, tests: true, assignments: true } } },
        orderBy: { name: "asc" },
    })
    return NextResponse.json(batches)
}

export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    const body = await req.json().catch(() => null)
    const name = cleanName(body?.name)
    const courseId = typeof body?.courseId === "string" ? body.courseId : ""
    if (!name || !courseId) return new NextResponse("Name and course are required", { status: 400 })
    try {
        return NextResponse.json(await db.batch.create({ data: { name, courseId } }))
    } catch (error) {
        return dbErrorResponse(error, "batch", "BATCHES_POST")
    }
}
