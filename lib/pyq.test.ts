import { describe, expect, it } from "vitest"
import { chapterTestMinutes, formatDuration, parseSeconds, pickChapterSet, practiceDeadline } from "./pyq"

describe("pyq helpers", () => {
    it("times chapter tests at the JEE Main pace", () => {
        expect(chapterTestMinutes(75)).toBe(180)
        expect(chapterTestMinutes(10)).toBe(24)
        expect(chapterTestMinutes(1)).toBe(5)
    })

    it("prefers questions the learner hasn't seen", () => {
        const pool = ["a", "b", "c", "d", "e"]
        const got = pickChapterSet(pool, new Set(["a", "b", "c"]), 3)
        expect(got.slice(0, 2).sort()).toEqual(["d", "e"])
        expect(got).toHaveLength(3)
        expect(pickChapterSet(pool, new Set(), 10)).toHaveLength(5)
    })

    it("works out the deadline only for timed attempts", () => {
        const startedAt = new Date("2026-11-27T10:00:00Z")
        expect(practiceDeadline({ mode: "TEST", startedAt, duration: 30 })?.toISOString()).toBe("2026-11-27T10:30:00.000Z")
        expect(practiceDeadline({ mode: "PRACTICE", startedAt, duration: 30 })).toBeNull()
    })

    it("parses and formats time spent", () => {
        expect(parseSeconds('{"a":12.4,"b":-1,"c":"x"}')).toEqual({ a: 12 })
        expect(formatDuration(45)).toBe("45s")
        expect(formatDuration(750)).toBe("12m 30s")
        expect(formatDuration(3900)).toBe("1h 5m")
    })
})
