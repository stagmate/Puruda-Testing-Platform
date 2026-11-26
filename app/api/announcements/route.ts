import { NextResponse } from "next/server"
import { requireRole, STAFF } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { readAnnouncement } from "@/lib/announcements"

const author = { select: { name: true, role: true } }

// GET: announcements showing on the site now (started, not yet ended).
// Staff can pass ?scope=manage to get every announcement, including scheduled
// and expired ones.
export async function GET(req: Request) {
    const auth = await requireRole()
    if (auth.response) return auth.response

    const manage = new URL(req.url).searchParams.get("scope") === "manage"
    if (manage && auth.user.role !== "ADMIN" && auth.user.role !== "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const now = new Date()
    try {
        const announcements = await db.announcement.findMany({
            where: manage ? {} : { active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            orderBy: manage ? { startsAt: "desc" } : [{ startsAt: "desc" }, { createdAt: "desc" }],
            include: { author },
        })
        return NextResponse.json(announcements)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_GET]", error)
        return NextResponse.json({ error: "Couldn't load announcements" }, { status: 500 })
    }
}

// POST: create an announcement (staff). It appears on the site from startsAt.
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { data, error } = readAnnouncement(await req.json().catch(() => null))
    if (error || !data) return NextResponse.json({ error }, { status: 400 })
    if (data.endsAt.getTime() <= Date.now()) return NextResponse.json({ error: "The end date is already past" }, { status: 400 })

    try {
        const announcement = await db.announcement.create({ data: { ...data, authorId: auth.user.id }, include: { author } })
        return NextResponse.json(announcement)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_POST]", error)
        return NextResponse.json({ error: "Couldn't save the announcement" }, { status: 500 })
    }
}
