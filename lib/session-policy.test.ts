import { describe, it, expect } from "vitest"
import { endReason, heartbeatDecision, type SessionTimes } from "./session-policy"

const policy = { heartbeatMs: 20_000, closeGraceMs: 30_000, goneAfterMs: 300_000, idleAfterMs: 1_800_000, maxAgeMs: 43_200_000 }
const T0 = new Date("2026-11-16T10:00:00Z")
const at = (ms: number) => new Date(T0.getTime() + ms)
const fresh = (over: Partial<SessionTimes> = {}): SessionTimes => ({
    createdAt: T0, lastSeenAt: T0, lastActiveAt: T0, closingAt: null, revokedAt: null, revokedReason: null, ...over,
})

describe("endReason", () => {
    it("keeps an active session", () => {
        expect(endReason(fresh({ lastSeenAt: at(60_000), lastActiveAt: at(60_000) }), at(70_000), policy)).toBeNull()
    })
    it("ends a session that was closed and not reopened within the grace period", () => {
        const s = fresh({ lastSeenAt: at(10_000), closingAt: at(11_000) })
        expect(endReason(s, at(30_000), policy)).toBeNull()
        expect(endReason(s, at(42_000), policy)).toBe("closed")
    })
    it("a check-in after the close (reload, another tab) cancels it", () => {
        const s = fresh({ lastSeenAt: at(13_000), closingAt: at(11_000) })
        expect(endReason(s, at(60_000), policy)).toBeNull()
    })
    it("ends when no tab has checked in for a while", () => {
        expect(endReason(fresh(), at(300_001), policy)).toBe("gone")
    })
    it("ends after inactivity even if the tab keeps checking in", () => {
        expect(endReason(fresh({ lastSeenAt: at(1_800_000) }), at(1_800_001), policy)).toBe("idle")
    })
    it("ends at the absolute limit", () => {
        const now = at(43_200_001)
        expect(endReason(fresh({ lastSeenAt: now, lastActiveAt: now }), now, policy)).toBe("expired")
    })
    it("reports the revoke reason", () => {
        expect(endReason(fresh({ revokedAt: at(1), revokedReason: "replaced" }), at(2), policy)).toBe("replaced")
        expect(endReason(fresh({ revokedAt: at(1) }), at(2), policy)).toBe("signed_out")
    })
})

describe("heartbeatDecision", () => {
    it("a reload of the same tab within the grace period keeps the session", () => {
        const s = fresh({ lastSeenAt: at(10_000), closingAt: at(11_000) })
        expect(heartbeatDecision(s, true, at(14_000), policy)).toEqual({ ok: true })
    })
    it("reopening the site in a fresh tab after closing it ends the session", () => {
        const s = fresh({ lastSeenAt: at(10_000), closingAt: at(11_000) })
        expect(heartbeatDecision(s, false, at(14_000), policy)).toEqual({ end: "closed" })
    })
    it("a new tab while others are open is fine", () => {
        expect(heartbeatDecision(fresh({ lastSeenAt: at(5_000) }), false, at(6_000), policy)).toEqual({ ok: true })
    })
})
