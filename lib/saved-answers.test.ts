import { describe, it, expect } from "vitest"
import { cleanAnswers, cleanVisited, parseJson } from "./saved-answers"

const ids = new Set(["a", "b", "c", "d"])

describe("cleanAnswers", () => {
    it("keeps valid answers to this test's questions", () => {
        expect(cleanAnswers({ a: 2, b: [0, 3, 3], c: "12.5", d: "", x: 1 }, ids)).toEqual({ a: 2, b: [0, 3], c: "12.5", d: "" })
    })
    it("drops malformed values", () => {
        expect(cleanAnswers({ a: -1, b: [1, "x"], c: "9".repeat(41), d: { hack: 1 } }, ids)).toEqual({})
        expect(cleanAnswers([1, 2], ids)).toEqual({})
        expect(cleanAnswers(null, ids)).toEqual({})
    })
})

describe("cleanVisited", () => {
    it("keeps in-range question numbers once, sorted", () => {
        expect(cleanVisited([3, 0, 3, 9, -1, 1.5, "2"], 5)).toEqual([0, 3])
        expect(cleanVisited("nope", 5)).toEqual([])
    })
})

describe("parseJson", () => {
    it("never throws", () => {
        expect(parseJson('{"a":1}')).toEqual({ a: 1 })
        expect(parseJson("{bad")).toBeNull()
        expect(parseJson(null)).toBeNull()
    })
})
