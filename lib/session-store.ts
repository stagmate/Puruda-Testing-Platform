import { db } from "@/lib/db"
import { endReason, heartbeatDecision, type EndReason } from "@/lib/session-policy"

// Students may only be signed in once at a time (stops account sharing during tests).
const SINGLE_SESSION_ROLES = new Set(["STUDENT"])

export async function createSession(user: { id: string; role: string }, meta: { ip?: string | null; userAgent?: string | null }) {
    if (SINGLE_SESSION_ROLES.has(user.role)) {
        await db.userSession.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date(), revokedReason: "replaced" },
        })
    }
    const session = await db.userSession.create({
        data: {
            userId: user.id,
            ipAddress: meta.ip?.slice(0, 64) ?? null,
            userAgent: meta.userAgent?.slice(0, 300) ?? null,
        },
        select: { id: true },
    })
    return session.id
}

async function end(id: string, reason: EndReason) {
    await db.userSession.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } })
}

/** Is this session still valid? Ends it in the database the first time it isn't. */
export async function checkSession(id: string | undefined | null, userId: string): Promise<{ ok: true } | { ok: false; reason: EndReason }> {
    if (!id) return { ok: false, reason: "signed_out" }
    const s = await db.userSession.findUnique({ where: { id } })
    if (!s || s.userId !== userId) return { ok: false, reason: "signed_out" }
    const reason = endReason(s)
    if (reason) {
        if (!s.revokedAt) await end(id, reason)
        return { ok: false, reason }
    }
    return { ok: true }
}

/** A tab checking in. `active`: the user did something since the last check-in. */
export async function heartbeat(id: string, userId: string, opts: { active: boolean; knownTab: boolean }) {
    const s = await db.userSession.findUnique({ where: { id } })
    if (!s || s.userId !== userId) return { ok: false as const, reason: "signed_out" as EndReason }
    const decision = heartbeatDecision(s, opts.knownTab)
    if ("end" in decision) {
        if (!s.revokedAt) await end(id, decision.end)
        return { ok: false as const, reason: decision.end }
    }
    const now = new Date()
    const updated = await db.userSession.update({
        where: { id },
        data: { lastSeenAt: now, closingAt: null, ...(opts.active ? { lastActiveAt: now } : {}) },
        select: { createdAt: true, lastActiveAt: true },
    })
    return { ok: true as const, ...updated }
}

/** A tab is closing. Unless a reload or another open tab checks in soon, the session ends. */
export async function markClosing(id: string, userId: string) {
    await db.userSession.updateMany({ where: { id, userId, revokedAt: null }, data: { closingAt: new Date() } })
}

export async function signOutSession(id: string | undefined | null) {
    if (id) await end(id, "signed_out")
}

/** End every session of a user (e.g. after a password change or account deletion). */
export async function signOutEverywhere(userId: string) {
    await db.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: "signed_out" } })
}
