import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    try {
        const users = await db.user.findMany({
            select: { email: true, role: true, id: true }
        })

        return NextResponse.json({
            count: users.length,
            users: users
        })
    } catch (error) {
        return NextResponse.json({ error: "DB Connection Failed" }, { status: 500 })
    }
}
