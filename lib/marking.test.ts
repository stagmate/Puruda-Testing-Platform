import { describe, it, expect } from "vitest"
import { gradeWithScheme, questionMarks, normalizeScheme, parseScheme, presetOf, describeScheme, MARKING_PRESETS, STANDARD_SCHEME } from "./marking"
import { gradeTest } from "./grading"

const opts = JSON.stringify(["(A)", "(B)", "(C)", "(D)"])
const single = { id: "s", type: "SINGLE", options: opts, correct: "B" }
const multi3 = { id: "m", type: "MULTIPLE", options: opts, correct: "A,B,D" }
const multi4 = { id: "m4", type: "MULTIPLE", options: opts, correct: "A,B,C,D" }
const numeric = { id: "n", type: "INTEGER", options: "[]", correct: "8.80 to 9.40" }
const MAIN = MARKING_PRESETS.JEE_MAIN.scheme
const ADV = MARKING_PRESETS.JEE_ADVANCED.scheme

describe("questionMarks", () => {
    it("JEE Main: +4 / −1 / 0 unanswered", () => {
        expect(questionMarks(single, 1, MAIN)).toBe(4)
        expect(questionMarks(single, 2, MAIN)).toBe(-1)
        expect(questionMarks(single, undefined, MAIN)).toBe(0)
        expect(questionMarks(numeric, "9", MAIN)).toBe(4)
        expect(questionMarks(numeric, "12", MAIN)).toBe(-1)
        expect(questionMarks(numeric, "", MAIN)).toBe(0)
    })

    it("JEE Advanced multiple-correct: full, partial and negative", () => {
        expect(questionMarks(multi3, [0, 1, 3], ADV)).toBe(4)
        expect(questionMarks(multi3, [0, 1], ADV)).toBe(2)     // 2 of 3 correct chosen, none wrong
        expect(questionMarks(multi3, [3], ADV)).toBe(1)
        expect(questionMarks(multi4, [0, 1, 2], ADV)).toBe(3)  // 3 of 4
        expect(questionMarks(multi3, [0, 2], ADV)).toBe(-2)    // a wrong option chosen
        expect(questionMarks(multi3, [], ADV)).toBe(0)
        expect(questionMarks(numeric, "100", ADV)).toBe(0)     // numeric: no negative
        expect(questionMarks(single, 0, ADV)).toBe(-1)
    })

    it("partial marks need the partial option", () => {
        expect(questionMarks(multi3, [0, 1], MAIN)).toBe(-1)
    })
})

describe("gradeWithScheme", () => {
    it("adds marks and the maximum", () => {
        const qs = [single, multi3, numeric]
        expect(gradeWithScheme(qs, { s: 1, m: [0], n: "9.2" }, ADV)).toEqual({ score: 3 + 1 + 4, total: 3 + 4 + 4 })
        expect(gradeWithScheme(qs, { s: 0, m: [0, 2] }, ADV)).toEqual({ score: -1 - 2, total: 11 })
    })

    it("standard scheme matches the old 1-point grading", () => {
        const qs = [single, multi3, numeric]
        const r = { s: 1, m: [0, 1], n: "9" }
        expect(gradeWithScheme(qs, r)).toEqual(gradeTest(qs, r))
    })
})

describe("schemes", () => {
    it("normalises presets, objects and junk", () => {
        expect(normalizeScheme("JEE_MAIN")).toEqual(MAIN)
        expect(normalizeScheme({ single: { correct: 5, wrong: -2 } }).single).toEqual({ correct: 5, wrong: -2 })
        expect(normalizeScheme({ single: { correct: -3, wrong: 4 } }).single).toEqual({ correct: 1, wrong: 0 })
        expect(normalizeScheme("nope")).toEqual(STANDARD_SCHEME)
        expect(parseScheme(null)).toEqual(STANDARD_SCHEME)
        expect(parseScheme("{bad")).toEqual(STANDARD_SCHEME)
        expect(parseScheme(JSON.stringify(ADV))).toEqual(ADV)
    })

    it("names presets and describes custom schemes", () => {
        expect(presetOf(ADV)).toBe("JEE_ADVANCED")
        const custom = normalizeScheme({ single: { correct: 2, wrong: -1 } })
        expect(presetOf(custom)).toBeNull()
        expect(describeScheme(custom)).toMatch(/Single \+2\/-1/)
    })
})
