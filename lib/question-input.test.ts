import { describe, it, expect } from "vitest"
import { normalizeQuestion, draftFromQuestion } from "./question-input"
import { isAnswerCorrect } from "./grading"

const mcq = { type: "SINGLE", text: "Unit of force?", options: ["Newton", "Joule", "Watt", "Pascal"] }

describe("normalizeQuestion", () => {
    it("accepts letters, option text and 'Option X' for SINGLE", () => {
        for (const correct of ["A", "Newton", "Option A", ["A"]]) {
            const { fields, error } = normalizeQuestion({ ...mcq, correct })
            expect(error).toBeUndefined()
            expect(fields!.correct).toBe("Newton")
        }
    })

    it("stores MULTIPLE answers as a JSON list that grades correctly", () => {
        const { fields } = normalizeQuestion({ ...mcq, type: "MULTIPLE", correct: ["C", "A"] })
        expect(fields!.correct).toBe('["Newton","Watt"]')
        expect(isAnswerCorrect({ type: "MULTIPLE", options: fields!.options, correct: fields!.correct }, [0, 2])).toBe(true)
    })

    it("splits a comma list for MULTIPLE (CSV style) but keeps option text with commas", () => {
        expect(normalizeQuestion({ ...mcq, type: "MULTIPLE", correct: "A,C" }).fields!.correct).toBe('["Newton","Watt"]')
        const withComma = { type: "SINGLE", text: "x", options: ["1,000", "100"], correct: "1,000" }
        expect(normalizeQuestion(withComma).fields!.correct).toBe("1,000")
    })

    it("uses letters for image-only or duplicate options", () => {
        const { fields } = normalizeQuestion({
            type: "SINGLE", text: "Which curve?", options: ["", "", "", ""],
            optionImages: ["/api/assets/a", "/api/assets/b", "/api/assets/c", "/api/assets/d"], correct: "B",
        })
        expect(fields!.correct).toBe("B")
        expect(fields!.optionBImageUrl).toBe("/api/assets/b")
        expect(isAnswerCorrect({ type: "SINGLE", options: fields!.options, correct: fields!.correct }, 1)).toBe(true)
    })

    it("validates INTEGER answers", () => {
        expect(normalizeQuestion({ type: "INTEGER", text: "pH?", correct: "4" }).fields!.correct).toBe("4")
        expect(normalizeQuestion({ type: "INTEGER", text: "pH?", correct: "four" }).error).toMatch(/numeric/)
    })

    it("rejects bad input", () => {
        expect(normalizeQuestion({ ...mcq, correct: "Volt" }).error).toMatch(/match/)
        expect(normalizeQuestion({ ...mcq, correct: ["A", "B"] }).error).toMatch(/exactly one/)
        expect(normalizeQuestion({ ...mcq, correct: "" }).error).toMatch(/correct/)
        expect(normalizeQuestion({ type: "SINGLE", text: "x", options: ["a"], correct: "A" }).error).toMatch(/two options/)
        expect(normalizeQuestion({ type: "SINGLE", text: "x", options: ["a", "", "c"], correct: "A" }).error).toMatch(/blank/)
        expect(normalizeQuestion({ ...mcq, type: "ESSAY", correct: "A" }).error).toMatch(/Type/)
        expect(normalizeQuestion({ ...mcq, imageUrl: "javascript:alert(1)", correct: "A" }).fields!.imageUrl).toBeNull()
    })

    it("drops empty trailing options", () => {
        const { fields } = normalizeQuestion({ type: "SINGLE", text: "x", options: ["a", "b", "c", ""], correct: "C" })
        expect(JSON.parse(fields!.options)).toEqual(["a", "b", "c"])
    })
})

describe("draftFromQuestion", () => {
    it("round-trips a stored question back to letters", () => {
        const { fields } = normalizeQuestion({ ...mcq, type: "MULTIPLE", correct: ["B", "D"] })
        const draft = draftFromQuestion(fields!)
        expect(draft.correct).toEqual(["B", "D"])
        expect(draft.options).toEqual(["Newton", "Joule", "Watt", "Pascal"])
    })
})
