import { describe, it, expect } from "vitest"
import { subjectBreakdown, parseAnswers, rankOf } from "./result-breakdown"
import { MARKING_PRESETS } from "./marking"

const opts = JSON.stringify(["(A)", "(B)", "(C)", "(D)"])
const qs = [
    { id: "m1", type: "SINGLE", options: opts, correct: "A", subject: { name: "Mathematics" } },
    { id: "m2", type: "SINGLE", options: opts, correct: "B", subject: { name: "Mathematics" } },
    { id: "p1", type: "MULTIPLE", options: opts, correct: "A,B,C", subject: { name: "Physics" } },
    { id: "p2", type: "INTEGER", options: "[]", correct: "5", subject: { name: "Physics" } },
    { id: "g1", type: "SINGLE", options: opts, correct: "C", subject: null },
]

describe("subjectBreakdown", () => {
    it("adds marks and counts per subject in paper order", () => {
        const rows = subjectBreakdown(qs, { m1: 0, m2: 3, p1: [0, 1], g1: 2 }, MARKING_PRESETS.JEE_ADVANCED.scheme)
        expect(rows).toEqual([
            { subject: "Mathematics", score: 3 - 1, total: 6, correct: 1, partial: 0, wrong: 1, unanswered: 0 },
            { subject: "Physics", score: 2, total: 8, correct: 0, partial: 1, wrong: 0, unanswered: 1 },
            { subject: "General", score: 3, total: 3, correct: 1, partial: 0, wrong: 0, unanswered: 0 },
        ])
    })
})

describe("helpers", () => {
    it("parses saved answers safely", () => {
        expect(parseAnswers('{"a":1}')).toEqual({ a: 1 })
        expect(parseAnswers("[1]")).toEqual({})
        expect(parseAnswers("nope")).toEqual({})
        expect(parseAnswers(null)).toEqual({})
    })
    it("ranks with ties", () => {
        expect(rankOf(50, [70, 50, 50, 20])).toBe(2)
        expect(rankOf(70, [70, 50])).toBe(1)
    })
})
