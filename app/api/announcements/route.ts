import { NextResponse } from "next/server"
import { requireRole, STAFF } from "@/lib/api-auth"
import { db } from "@/lib/db"

// GET: Fetch all active announcements (Public/Protected)
export async function GET() {
    const auth = await requireRole()
    if (auth.response) return auth.response

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
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response
    const user = auth.user

    try {
        const { title, content } = await req.json()
        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
        }

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
