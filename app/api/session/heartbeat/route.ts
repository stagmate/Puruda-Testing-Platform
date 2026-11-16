import { NextResponse } from "next/server"
import { readSessionCookie } from "@/lib/session-cookie"
import { heartbeat } from "@/lib/session-store"
import { SESSION_POLICY, END_MESSAGES } from "@/lib/session-policy"

// An open tab checks in. Keeps the session alive while the site is open; tells the
// tab to sign out (with the reason) once the session has ended.
export async function POST(req: Request) {
    const cookie = await readSessionCookie()
    if (!cookie) return NextResponse.json({ ok: false, reason: "signed_out", message: END_MESSAGES.signed_out }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const result = await heartbeat(cookie.sid, cookie.userId, { active: body?.active === true, knownTab: body?.knownTab === true })
    if (!result.ok) {
        return NextResponse.json({ ok: false, reason: result.reason, message: END_MESSAGES[result.reason] }, { status: 401 })
    }
    return NextResponse.json({
        ok: true,
        heartbeatMs: SESSION_POLICY.heartbeatMs,
        idleLogoutAt: new Date(result.lastActiveAt.getTime() + SESSION_POLICY.idleAfterMs),
        expiresAt: new Date(result.createdAt.getTime() + SESSION_POLICY.maxAgeMs),
    }, { headers: { "Cache-Control": "no-store" } })
}
