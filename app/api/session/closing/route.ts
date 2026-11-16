import { NextResponse } from "next/server"
import { readSessionCookie } from "@/lib/session-cookie"
import { markClosing } from "@/lib/session-store"

// Sent (with navigator.sendBeacon) when a tab is closed or reloaded. The session
// ends after a short grace period unless the reloaded tab or another open tab
// checks in. Same-site only: the login cookie isn't sent on cross-site POSTs.
export async function POST() {
    const cookie = await readSessionCookie()
    if (cookie) await markClosing(cookie.sid, cookie.userId)
    return new NextResponse(null, { status: 204 })
}
