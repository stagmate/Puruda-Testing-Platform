import { describe, expect, it } from "vitest"
import { answersRevealed, buildReview } from "./answer-review"
import { MARKING_PRESETS } from "./marking"

const jee = MARKING_PRESETS.JEE_MAIN.scheme
const questions = [
    { id: "s", type: "SINGLE", text: "2+2?", options: JSON.stringify(["3", "4", "5", "6"]), correct: "4", solution: "Add them." },
    { id: "m", type: "MULTIPLE", text: "Noble gases?", options: JSON.stringify(["He", "O2", "Ne", "N2"]), correct: JSON.stringify(["He", "Ne"]) },
    { id: "n", type: "INTEGER", text: "Electrons in O2-?", options: "[]", correct: "10" },
    { id: "u", type: "SINGLE", text: "Skipped", options: JSON.stringify(["a", "b"]), correct: "a", subject: { name: "Physics" } },
]

describe("buildReview", () => {
    const review = buildReview(questions, { s: 1, m: [0], n: "10" }, jee, true)

    it("marks each question and keeps test order", () => {
        expect(review.map(r => [r.number, r.status, r.marks, r.maxMarks])).toEqual([
            [1, "correct", 4, 4],
            [2, "wrong", -1, 4],
            [3, "correct", 4, 4],
            [4, "unanswered", 0, 4],
        ])
    })

    it("includes the student's answer, the correct answer and the solution", () => {
        expect(review[0]).toMatchObject({ chosen: [1], correct: [1], solution: "Add them." })
        expect(review[1]).toMatchObject({ chosen: [0], correct: [0, 2] })
        expect(review[2]).toMatchObject({ typed: "10", correctText: "10", options: [] })
        expect(review[3]).toMatchObject({ chosen: null, subject: "Physics" })
    })

    it("hides correct answers and solutions when not revealed", () => {
        const hidden = buildReview(questions, { s: 1 }, jee, false)
        expect(hidden[0].chosen).toEqual([1])
        expect(hidden[0]).not.toHaveProperty("correct")
        expect(hidden[0]).not.toHaveProperty("solution")
    })
})

describe("answersRevealed", () => {
    it("reveals once the test has closed, or when it has no end", () => {
        const now = Date.parse("2026-11-26T12:00:00Z")
        expect(answersRevealed({ endTime: null }, now)).toBe(true)
        expect(answersRevealed({ endTime: "2026-11-26T11:00:00Z" }, now)).toBe(true)
        expect(answersRevealed({ endTime: "2026-11-26T13:00:00Z" }, now)).toBe(false)
    })
})
