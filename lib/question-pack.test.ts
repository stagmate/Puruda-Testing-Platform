import { describe, it, expect } from "vitest"
import { readPack, toQuestionInput, dataUrlBytes, matchExisting, PACK_FORMAT } from "./question-pack"
import { normalizeQuestion } from "./question-input"

const PNG = "data:image/png;base64,iVBORw0KGgo="
const pack = (questions: unknown[]) => ({ format: PACK_FORMAT, version: 1, title: "Test pack", questions })
const mcq = { paper: "JEE Main", subject: "Physics", number: 1, type: "SINGLE", correct: "B", options: ["(A)", "(B)", "(C)", "(D)"], image: PNG }

describe("readPack", () => {
    it("reads valid questions of every type", () => {
        const { questions, problems, title } = readPack(pack([
            mcq,
            { ...mcq, type: "MULTIPLE", correct: "A,C,D" },
            { ...mcq, type: "INTEGER", correct: "8.80 to 9.40", options: undefined },
        ]))
        expect(problems).toEqual([])
        expect(title).toBe("Test pack")
        expect(questions.map(q => q.type)).toEqual(["SINGLE", "MULTIPLE", "INTEGER"])
    })

    it("rejects files that aren't packs", () => {
        expect(readPack({ questions: [] }).problems[0]).toMatch(/isn't a question pack/)
        expect(readPack(null).problems[0]).toMatch(/isn't a question pack/)
        expect(readPack({ ...pack([mcq]), version: 2 }).problems[0]).toMatch(/version/)
    })

    it("names the questions with bad answer keys or images", () => {
        const { questions, problems } = readPack(pack([
            mcq,
            { ...mcq, number: 2, correct: "E" },
            { ...mcq, number: 3, type: "SINGLE", correct: "A,B" },
            { ...mcq, number: 4, type: "INTEGER", correct: "lots" },
            { ...mcq, number: 5, image: "javascript:alert(1)" },
            { ...mcq, number: 6, subject: "" },
        ]))
        expect(questions).toHaveLength(1)
        expect(problems).toHaveLength(5)
        expect(problems[0]).toMatch(/Physics Q2/)
    })

    it("produces input the server accepts", () => {
        const { questions } = readPack(pack([{ ...mcq, type: "MULTIPLE", correct: "A,D" }]))
        const input = toQuestionInput(questions[0], "/api/assets/abc", "subject-1")
        expect(input.subjectId).toBe("subject-1")
        expect(input.examTag).toBe("JEE Main")
        const { fields } = normalizeQuestion(input)
        expect(fields?.correct).toBe(JSON.stringify(["(A)", "(D)"]))
        expect(fields?.imageUrl).toBe("/api/assets/abc")
    })
})

describe("dataUrlBytes", () => {
    it("computes the decoded size", () => {
        expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3)
        expect(dataUrlBytes("data:image/png;base64,AAA=")).toBe(2)
    })
})

describe("pack tests", () => {
    it("reads tests and checks they point at a paper", () => {
        const base = pack([mcq, { ...mcq, paper: "JEE Advanced" }])
        const ok = readPack({ ...base, tests: [{ title: "Main", paper: "JEE Main", duration: 180, marking: "JEE_MAIN" }, { title: "Adv", paper: "JEE Advanced", duration: 180 }] })
        expect(ok.problems).toEqual([])
        expect(ok.tests[0]).toMatchObject({ title: "Main", paper: "JEE Main", duration: 180 })
        expect(ok.tests[0].marking.single).toEqual({ correct: 4, wrong: -1 })
        expect(ok.tests[1].marking.single).toEqual({ correct: 1, wrong: 0 })
        const bad = readPack({ ...base, tests: [{ title: "X", paper: "Nope", duration: 180 }, { title: "Y", paper: "JEE Main", duration: 0 }, { paper: "JEE Main", duration: 60 }] })
        expect(bad.problems).toHaveLength(3)
    })
})

describe("matchExisting", () => {
    it("reuses identical questions once each", () => {
        const { questions } = readPack(pack([
            { ...mcq, text: "Q one" }, { ...mcq, text: "Q two" }, { ...mcq, text: "Q one" }, { ...mcq, text: "" },
        ]))
        const existing = [
            { id: "e1", type: "SINGLE", text: "Q one", examTag: "JEE Main" },
            { id: "e2", type: "SINGLE", text: "Q two ", examTag: "JEE Main" },
            { id: "e3", type: "SINGLE", text: "Q two", examTag: "Other paper" },
        ]
        expect(matchExisting(questions, existing)).toEqual(["e1", "e2", null, null])
    })
})
