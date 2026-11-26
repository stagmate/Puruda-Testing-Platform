import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF, ADMIN_ONLY } from "@/lib/api-auth"
import { cleanName, dbErrorResponse } from "@/lib/api-errors"

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const courses = await db.course.findMany({
        include: { batches: true, _count: { select: { batches: true, tests: true, questions: true } } },
        orderBy: { name: "asc" },
    })
    return NextResponse.json(courses)
}

export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    const body = await req.json().catch(() => null)
    const name = cleanName(body?.name)
    if (!name) return new NextResponse("Name is required", { status: 400 })
    try {
        return NextResponse.json(await db.course.create({ data: { name } }))
    } catch (error) {
        return dbErrorResponse(error, "course", "COURSES_POST")
    }
}
