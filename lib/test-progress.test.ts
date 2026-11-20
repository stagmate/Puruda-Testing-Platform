import { describe, it, expect } from "vitest"
import { isAnswered, questionStatus, summarize } from "./test-progress"

describe("test progress", () => {
    it("knows what counts as answered", () => {
        expect(isAnswered(0)).toBe(true)
        expect(isAnswered([2])).toBe(true)
        expect(isAnswered("4.5")).toBe(true)
        expect(isAnswered([])).toBe(false)
        expect(isAnswered("  ")).toBe(false)
        expect(isAnswered(undefined)).toBe(false)
        expect(isAnswered(-1)).toBe(false)
    })

    it("gives each question a status", () => {
        expect(questionStatus(1, false)).toBe("answered")
        expect(questionStatus(undefined, true)).toBe("not-answered")
        expect(questionStatus("", false)).toBe("not-visited")
    })

    it("unlocks submit only after every question is visited", () => {
        const ids = ["a", "b", "c"]
        expect(summarize(ids, { a: 0 }, new Set([0, 1]))).toEqual({ answered: 1, notAnswered: 1, notVisited: 1, total: 3, canSubmit: false })
        expect(summarize(ids, { a: 0 }, new Set([0, 1, 2])).canSubmit).toBe(true)
        expect(summarize(ids, {}, new Set([0, 1, 2]))).toMatchObject({ answered: 0, notAnswered: 3, canSubmit: true })
    })
})
