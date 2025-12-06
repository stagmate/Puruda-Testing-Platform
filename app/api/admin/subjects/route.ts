import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    const subjects = await db.subject.findMany()
    return NextResponse.json(subjects)
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json()
        const subject = await db.subject.create({ data: { name } })
        return NextResponse.json(subject)
    } catch (error) {
        return new NextResponse("Error creating subject", { status: 500 })
    }
}
