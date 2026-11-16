// Rules for when a login session ends. Pure functions so they can be unit tested;
// the database side lives in lib/session-store.ts.
//
// A session ends when any of these happens:
//   signed_out  the user logged out
//   closed      the last open tab was closed (or the site was reopened in a fresh tab after closing)
//   gone        no open tab has checked in for a while (browser crashed, phone killed it)
//   idle        no clicks, typing or scrolling for a while
//   expired     the session is older than the absolute limit
//   replaced    a student signed in somewhere else (one session per student)

const seconds = (name: string, fallback: number) => {
    const v = Number(process.env[name])
    return Number.isFinite(v) && v > 0 ? v * 1000 : fallback * 1000
}

export const SESSION_POLICY = {
    /** How often an open tab checks in. */
    heartbeatMs: seconds("SESSION_HEARTBEAT_SECONDS", 20),
    /** After a tab says it is closing: time for a reload or another open tab to check in. */
    closeGraceMs: seconds("SESSION_CLOSE_GRACE_SECONDS", 30),
    /** No check-in from any tab for this long ends the session (crash, killed app, frozen tab). */
    goneAfterMs: seconds("SESSION_GONE_SECONDS", 5 * 60),
    /** No user activity for this long ends the session. */
    idleAfterMs: seconds("SESSION_IDLE_SECONDS", 30 * 60),
    /** Hard limit on any session, however active. */
    maxAgeMs: seconds("SESSION_MAX_AGE_SECONDS", 12 * 60 * 60),
}

export type EndReason = "signed_out" | "closed" | "gone" | "idle" | "expired" | "replaced"

export type SessionTimes = {
    createdAt: Date
    lastSeenAt: Date
    lastActiveAt: Date
    closingAt: Date | null
    revokedAt: Date | null
    revokedReason: string | null
}

/** Why this session has ended, or null if it is still valid at `now`. */
export function endReason(s: SessionTimes, now = new Date(), policy = SESSION_POLICY): EndReason | null {
    const t = now.getTime()
    if (s.revokedAt) return (s.revokedReason as EndReason) || "signed_out"
    if (t - s.createdAt.getTime() > policy.maxAgeMs) return "expired"
    if (s.closingAt && s.lastSeenAt.getTime() <= s.closingAt.getTime() && t - s.closingAt.getTime() > policy.closeGraceMs) return "closed"
    if (t - s.lastSeenAt.getTime() > policy.goneAfterMs) return "gone"
    if (t - s.lastActiveAt.getTime() > policy.idleAfterMs) return "idle"
    return null
}

/**
 * Decide what a heartbeat does. `knownTab` is true when the tab already belonged
 * to this browsing session before (same tab after a reload, or another tab that
 * was open all along); a brand-new tab opened after the last one closed is not.
 */
export function heartbeatDecision(s: SessionTimes, knownTab: boolean, now = new Date(), policy = SESSION_POLICY): { end: EndReason } | { ok: true } {
    const ended = endReason(s, now, policy)
    if (ended) return { end: ended }
    // The site was closed and is now being reopened in a fresh tab: that's a new visit.
    if (s.closingAt && s.lastSeenAt.getTime() <= s.closingAt.getTime() && !knownTab) return { end: "closed" }
    return { ok: true }
}

export const END_MESSAGES: Record<EndReason, string> = {
    signed_out: "You have been signed out.",
    closed: "You were signed out because the site was closed.",
    gone: "You were signed out because the site wasn't open for a while.",
    idle: "You were signed out because there was no activity for a while.",
    expired: "Your session has expired. Please sign in again.",
    replaced: "You were signed out because your account signed in on another device.",
}
