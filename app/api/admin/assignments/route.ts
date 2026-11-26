import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"
import { dbErrorResponse } from "@/lib/api-errors"

export async function GET() {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    const assignments = await db.teacherAssignment.findMany({
        include: {
            teacher: { select: { name: true, email: true } },
            batch: { select: { name: true, course: { select: { name: true } } } },
            subject: { select: { name: true } },
        },
        orderBy: [{ teacher: { name: "asc" } }],
    })
    return NextResponse.json(assignments)
}

export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    const body = await req.json().catch(() => null)
    const { teacherId, batchId, subjectId } = body ?? {}
    if (![teacherId, batchId, subjectId].every(v => typeof v === "string" && v)) {
        return new NextResponse("Choose a teacher, batch and subject", { status: 400 })
    }
    try {
        return NextResponse.json(await db.teacherAssignment.create({ data: { teacherId, batchId, subjectId } }))
    } catch (error) {
        return dbErrorResponse(error, "teacher assignment", "ASSIGNMENTS_POST", "This teacher is already assigned to that batch and subject")
    }
}
