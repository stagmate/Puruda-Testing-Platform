import { describe, expect, it } from "vitest"
import { announcementStatus, dayEnd, dayStart, isNewAnnouncement, scheduleError, toDayInput } from "./announcements"

const now = new Date("2026-11-26T12:00:00Z").getTime()
const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000)

describe("announcement schedule", () => {
    it("is scheduled before its start, live during, expired after its end", () => {
        expect(announcementStatus({ startsAt: days(1), endsAt: days(5) }, now)).toBe("scheduled")
        expect(announcementStatus({ startsAt: days(-1), endsAt: days(5) }, now)).toBe("live")
        expect(announcementStatus({ startsAt: days(-5), endsAt: days(-1) }, now)).toBe("expired")
        expect(announcementStatus({ startsAt: days(-5), endsAt: null }, now)).toBe("live")
    })

    it("is new for the first three days after it starts", () => {
        expect(isNewAnnouncement({ startsAt: days(-2.9), endsAt: days(10) }, now)).toBe(true)
        expect(isNewAnnouncement({ startsAt: days(-3.1), endsAt: days(10) }, now)).toBe(false)
        expect(isNewAnnouncement({ startsAt: days(1), endsAt: days(10) }, now)).toBe(false)
        expect(isNewAnnouncement({ startsAt: days(-1), endsAt: days(-0.5) }, now)).toBe(false)
    })

    it("requires an end after the start", () => {
        expect(scheduleError(days(0), null)).toMatch(/end date/)
        expect(scheduleError(days(2), days(1))).toMatch(/after/)
        expect(scheduleError(days(0), days(1))).toBeNull()
    })

    it("converts date inputs to whole local days and back", () => {
        expect(dayStart("2026-12-01").getHours()).toBe(0)
        expect(dayEnd("2026-12-01").getHours()).toBe(23)
        expect(toDayInput(dayStart("2026-12-01"))).toBe("2026-12-01")
        expect(toDayInput(dayEnd("2026-12-01"))).toBe("2026-12-01")
    })
})
