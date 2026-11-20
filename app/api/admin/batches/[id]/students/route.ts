import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"

type Params = { params: Promise<{ id: string }> }

const MAX_AT_ONCE = 1000

async function readIds(req: Request): Promise<string[] | null> {
    const body = await req.json().catch(() => null)
    const ids = body?.studentIds
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_AT_ONCE || ids.some((id: unknown) => typeof id !== "string")) return null
    return Array.from(new Set(ids as string[]))
}

// Students in a batch
export async function GET(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const batch = await db.batch.findUnique({
        where: { id },
        select: { id: true, name: true, students: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } } },
    })
    if (!batch) return new NextResponse("Batch not found", { status: 404 })
    return NextResponse.json(batch)
}

// Add students to a batch (only accounts with the STUDENT role)
export async function POST(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const ids = await readIds(req)
    if (!ids) return new NextResponse("Choose at least one student", { status: 400 })

    const students = await db.user.findMany({ where: { id: { in: ids }, role: "STUDENT" }, select: { id: true } })
    if (students.length === 0) return new NextResponse("None of these accounts are students", { status: 400 })
    try {
        const batch = await db.batch.update({
            where: { id },
            data: { students: { connect: students.map(s => ({ id: s.id })) } },
            select: { _count: { select: { students: true } } },
        })
        return NextResponse.json({ added: students.length, skipped: ids.length - students.length, total: batch._count.students })
    } catch {
        return new NextResponse("Batch not found", { status: 404 })
    }
}

// Remove students from a batch (their accounts and results are kept)
export async function DELETE(req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const ids = await readIds(req)
    if (!ids) return new NextResponse("Choose at least one student", { status: 400 })
    try {
        const batch = await db.batch.update({
            where: { id },
            data: { students: { disconnect: ids.map(s => ({ id: s })) } },
            select: { _count: { select: { students: true } } },
        })
        return NextResponse.json({ removed: ids.length, total: batch._count.students })
    } catch {
        return new NextResponse("Batch not found", { status: 404 })
    }
}
