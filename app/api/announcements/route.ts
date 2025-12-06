import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET: Fetch all active announcements (Public/Protected)
export async function GET() {
    try {
        const announcements = await db.announcement.findMany({
            where: { active: true },
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { name: true, role: true } } }
        })
        return NextResponse.json(announcements)
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

// POST: Create new announcement (Admin/Teacher only)
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || !user.role || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
            return NextResponse.json({ error: "Internal Error" }, { status: 500 })
        }

        const { title, content } = await req.json()

        const announcement = await db.announcement.create({
            data: {
                title,
                content,
                authorId: user.id
            }
        })

        return NextResponse.json(announcement)
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
