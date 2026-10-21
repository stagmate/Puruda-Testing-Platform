import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"

export async function GET() {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const subjects = await db.subject.findMany()
    return NextResponse.json(subjects)
}

export async function POST(req: Request) {
    // Teachers can add subjects from the question bank.
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const { name } = await req.json()
        if (!name || typeof name !== "string") return new NextResponse("Name is required", { status: 400 })
        const subject = await db.subject.create({ data: { name: name.trim() } })
        return NextResponse.json(subject)
    } catch (error) {
        console.error("[SUBJECTS_POST]", error)
        return new NextResponse("Error creating subject", { status: 500 })
    }
}
