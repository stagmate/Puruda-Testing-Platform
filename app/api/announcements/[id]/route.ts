import { NextResponse } from "next/server"
import { requireRole, STAFF } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { readAnnouncement } from "@/lib/announcements"

type Params = { params: Promise<{ id: string }> }

/** Admins can change any announcement; teachers only their own. */
async function findEditable(id: string, user: { id: string; role: string }) {
    const a = await db.announcement.findUnique({ where: { id }, select: { authorId: true } })
    if (!a) return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    if (user.role !== "ADMIN" && a.authorId !== user.id) return NextResponse.json({ error: "You can only change your own announcements" }, { status: 403 })
    return null
}

// PATCH: edit the title, message, start or end of an announcement
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response
    const { id } = await params
    const denied = await findEditable(id, auth.user)
    if (denied) return denied

    const { data, error } = readAnnouncement(await req.json().catch(() => null))
    if (error || !data) return NextResponse.json({ error }, { status: 400 })
    try {
        const updated = await db.announcement.update({ where: { id }, data, include: { author: { select: { name: true, role: true } } } })
        return NextResponse.json(updated)
    } catch (error) {
        console.error("[ANNOUNCEMENT_PATCH]", error)
        return NextResponse.json({ error: "Couldn't save the announcement" }, { status: 500 })
    }
}

export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response
    const { id } = await params
    const denied = await findEditable(id, auth.user)
    if (denied) return denied
    try {
        await db.announcement.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[ANNOUNCEMENT_DELETE]", error)
        return NextResponse.json({ error: "Couldn't delete the announcement" }, { status: 500 })
    }
}
