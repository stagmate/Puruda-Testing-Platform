import { describe, it, expect } from "vitest"
import { parseAnswer, mergeExtractions, stripLabel } from "./merge"
import { sanitizeExtraction, pixelBoxesToNormalized, type Extraction } from "./extraction"

describe("parseAnswer", () => {
    it("reads option letters in common formats", () => {
        expect(parseAnswer("B").letters).toEqual(["B"])
        expect(parseAnswer("(B) — 1.93 × 10^{5} C").letters).toEqual(["B"])
        expect(parseAnswer("A, C").letters).toEqual(["A", "C"])
        expect(parseAnswer("(A) and (D)").letters).toEqual(["A", "D"])
        expect(parseAnswer("AC").letters).toEqual(["A", "C"])
        expect(parseAnswer("Ans: C").letters).toEqual(["C"])
        expect(parseAnswer("B Cathode gains 3.175 g").letters).toEqual(["B"])
    })

    it("reads numeric answers", () => {
        expect(parseAnswer("12")).toEqual({ letters: [], value: "12" })
        expect(parseAnswer("Ans. 4.5")).toEqual({ letters: [], value: "4.5" })
        expect(parseAnswer("−3")).toEqual({ letters: [], value: "-3" })
        expect(parseAnswer("Both")).toEqual({ letters: [], value: null })
        expect(parseAnswer(null)).toEqual({ letters: [], value: null })
    })
})

const q = (over: Partial<Extraction["questions"][number]>) => ({
    number: "1", page: 1, section: null, text: "Q", type: "SINGLE" as const,
    options: ["A", "B", "C", "D"].map(l => ({ label: l, text: `opt ${l}`, figure: null })),
    figures: [], answer: null, solution: null, ...over,
})

describe("stripLabel", () => {
    it("removes punctuated labels but keeps options that start with the same word", () => {
        expect(stripLabel("(A) 96 500 C", "A")).toBe("96 500 C")
        expect(stripLabel("B. x", "B")).toBe("x")
        expect(stripLabel("C) y", "C")).toBe("y")
        expect(stripLabel("A is a weak electrolyte", "A")).toBe("A is a weak electrolyte")
        expect(stripLabel("B is a strong electrolyte", "B")).toBe("B is a strong electrolyte")
    })
})

describe("mergeExtractions", () => {
    it("joins answers from an answer key on a later page", () => {
        const merged = mergeExtractions([
            { questions: [q({ number: "1" }), q({ number: "2", options: [] })], answers: [] },
            { questions: [], answers: [{ number: "1", answer: "C", solution: null }, { number: "2", answer: "42", solution: "since..." }] },
        ])
        expect(merged[0].draft.correct).toEqual(["C"])
        expect(merged[0].warnings).toEqual([])
        expect(merged[1].draft.type).toBe("INTEGER")
        expect(merged[1].draft.correct).toEqual(["42"])
        expect(merged[1].draft.solution).toBe("since...")
    })

    it("turns multi-letter answers into MULTIPLE and flags missing answers", () => {
        const merged = mergeExtractions([{ questions: [q({ number: "5", answer: "A, D" }), q({ number: "6" })], answers: [] }])
        expect(merged[0].draft.type).toBe("MULTIPLE")
        expect(merged[0].draft.correct).toEqual(["A", "D"])
        expect(merged[1].warnings[0]).toMatch(/No answer/)
    })

    it("strips repeated labels and merges stem figures on one page", () => {
        const merged = mergeExtractions([{
            questions: [q({
                options: [{ label: "A", text: "(A) 96 500 C", figure: null }, { label: "B", text: "B. x", figure: null }],
                figures: [{ page: 3, box: [100, 100, 300, 500] }, { page: 3, box: [250, 50, 400, 450] }],
                answer: "A",
            })],
            answers: [],
        }])
        expect(merged[0].draft.options.slice(0, 2)).toEqual(["96 500 C", "x"])
        expect(merged[0].questionFigure).toEqual({ page: 3, box: [100, 50, 400, 500] })
    })
})

describe("sanitizeExtraction", () => {
    it("drops figures on pages that weren't sent and clamps boxes", () => {
        const out = sanitizeExtraction({
            questions: [{ number: "1", page: 2, text: "t", type: "BOGUS", options: [], figures: [{ page: 9, box: [0, 0, 10, 10] }, { page: 2, box: [-5, 0, 2000, 900] }] }],
            answers: [{ number: "1", answer: "B" }, { number: "", answer: "C" }],
        }, [2, 3])
        expect(out.questions[0].type).toBe("SINGLE")
        expect(out.questions[0].figures).toEqual([{ page: 2, box: [0, 0, 1000, 900] }])
        expect(out.answers).toHaveLength(1)
    })

    it("survives garbage", () => {
        expect(sanitizeExtraction("nope", [1])).toEqual({ questions: [], answers: [] })
    })
})

describe("pixelBoxesToNormalized", () => {
    it("converts pixel boxes on each page to the 0-1000 scale and fixes swapped corners", () => {
        const raw = {
            questions: [{
                number: "17", page: 3, text: "t", type: "SINGLE",
                figures: [{ page: 3, box: { x1: 417, y1: 588, x2: 1050, y2: 1085 } }],
                options: [{ label: "A", text: "", figure: { page: 3, box: { x1: 700, y1: 200, x2: 140, y2: 100 } } }],
            }],
            answers: [],
        }
        const out = sanitizeExtraction(pixelBoxesToNormalized(raw, [{ page: 3, width: 1400, height: 1980 }]), [3])
        expect(out.questions[0].figures).toEqual([{ page: 3, box: [297, 298, 548, 750] }])
        expect(out.questions[0].options[0].figure).toEqual({ page: 3, box: [51, 100, 101, 500] })
    })

    it("drops boxes for unknown pages or bad numbers", () => {
        const raw = { questions: [{ number: "1", page: 1, text: "t", type: "SINGLE", options: [],
            figures: [{ page: 9, box: { x1: 0, y1: 0, x2: 10, y2: 10 } }, { page: 1, box: { x1: "a", y1: 0, x2: 1, y2: 1 } }] }], answers: [] }
        const out = sanitizeExtraction(pixelBoxesToNormalized(raw, [{ page: 1, width: 100, height: 100 }]), [1])
        expect(out.questions[0].figures).toEqual([])
    })
})
