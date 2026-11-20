import { describe, it, expect } from "vitest"
import { isAnswerCorrect, gradeTest, resolveOptionIndex, parseNumericAnswer } from "./grading"

const opts = JSON.stringify(["Newton", "Joule", "Watt", "Pascal"])

describe("resolveOptionIndex", () => {
    it("understands every stored format", () => {
        const o = ["Newton", "Joule", "Watt", "Pascal"]
        expect(resolveOptionIndex("Joule", o)).toBe(1)
        expect(resolveOptionIndex("  joule ", o)).toBe(1)
        expect(resolveOptionIndex("B", o)).toBe(1)
        expect(resolveOptionIndex("Option C", o)).toBe(2)
        expect(resolveOptionIndex("(D) Pascal", o)).toBe(3)
        expect(resolveOptionIndex("0", o)).toBe(0)
        expect(resolveOptionIndex("nonsense", o)).toBe(-1)
    })

    it("prefers option text over index for numeric options", () => {
        expect(resolveOptionIndex("2", ["1", "2", "3", "4"])).toBe(1)
    })
})

describe("isAnswerCorrect", () => {
    it("grades SINGLE answers given as indexes", () => {
        expect(isAnswerCorrect({ type: "SINGLE", options: opts, correct: "Newton" }, 0)).toBe(true)
        expect(isAnswerCorrect({ type: "SINGLE", options: opts, correct: "Newton" }, 1)).toBe(false)
        // Seed data stores an index string
        expect(isAnswerCorrect({ type: "SINGLE", options: opts, correct: "0" }, 0)).toBe(true)
        // PDF parser format
        expect(isAnswerCorrect({ type: "SINGLE", options: opts, correct: "(B) Joule" }, 1)).toBe(true)
        // CSV letter
        expect(isAnswerCorrect({ type: "SINGLE", options: opts, correct: "C" }, 2)).toBe(true)
    })

    it("grades MULTIPLE answers regardless of order", () => {
        const q = { type: "MULTIPLE", options: opts, correct: JSON.stringify(["Watt", "Newton"]) }
        expect(isAnswerCorrect(q, [0, 2])).toBe(true)
        expect(isAnswerCorrect(q, [2, 0])).toBe(true)
        expect(isAnswerCorrect(q, [0])).toBe(false)
        expect(isAnswerCorrect(q, [0, 1, 2])).toBe(false)
        expect(isAnswerCorrect({ type: "MULTIPLE", options: opts, correct: "A,C" }, [0, 2])).toBe(true)
    })

    it("grades INTEGER answers numerically", () => {
        const q = { type: "INTEGER", options: "[]", correct: "10.5" }
        expect(isAnswerCorrect(q, "10.5")).toBe(true)
        expect(isAnswerCorrect(q, 10.5)).toBe(true)
        expect(isAnswerCorrect(q, "10")).toBe(false)
    })

    it("accepts decimals written differently", () => {
        const q = { type: "INTEGER", options: "[]", correct: "2.00" }
        expect(isAnswerCorrect(q, "2")).toBe(true)
        expect(isAnswerCorrect(q, " 2.0 ")).toBe(true)
        expect(isAnswerCorrect(q, "2.01")).toBe(false)
        expect(isAnswerCorrect(q, "2abc")).toBe(false)
    })

    it("grades numeric ranges inclusively", () => {
        const q = { type: "INTEGER", options: "[]", correct: "8.80 to 9.40" }
        expect(isAnswerCorrect(q, "8.8")).toBe(true)
        expect(isAnswerCorrect(q, "9.1")).toBe(true)
        expect(isAnswerCorrect(q, "9.40")).toBe(true)
        expect(isAnswerCorrect(q, "8.79")).toBe(false)
        expect(isAnswerCorrect(q, "9.41")).toBe(false)
        expect(isAnswerCorrect({ type: "INTEGER", options: "[]", correct: "1336.03 to 1336.04" }, "1336.035")).toBe(true)
    })

    it("treats blank or malformed answers as wrong without throwing", () => {
        const q = { type: "SINGLE", options: opts, correct: "Newton" }
        expect(isAnswerCorrect(q, undefined)).toBe(false)
        expect(isAnswerCorrect(q, null)).toBe(false)
        expect(isAnswerCorrect(q, { hack: true })).toBe(false)
        expect(isAnswerCorrect(q, 99)).toBe(false)
    })
})

describe("parseNumericAnswer", () => {
    it("reads values and ranges", () => {
        expect(parseNumericAnswer("12")).toEqual({ min: 12, max: 12 })
        expect(parseNumericAnswer("-2.5")).toEqual({ min: -2.5, max: -2.5 })
        expect(parseNumericAnswer("5.26 to 5.27")).toEqual({ min: 5.26, max: 5.27 })
        expect(parseNumericAnswer("-3 to -1")).toEqual({ min: -3, max: -1 })
        expect(parseNumericAnswer("9 to 8")).toBeNull()
        expect(parseNumericAnswer("four")).toBeNull()
        expect(parseNumericAnswer("")).toBeNull()
    })
})

describe("gradeTest", () => {
    it("adds up the score", () => {
        const questions = [
            { id: "a", type: "SINGLE", options: opts, correct: "Newton" },
            { id: "b", type: "SINGLE", options: opts, correct: "Joule" },
        ]
        expect(gradeTest(questions, { a: 0, b: 3 })).toEqual({ score: 1, total: 2 })
    })
})
