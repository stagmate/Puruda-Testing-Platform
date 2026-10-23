import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import path from "path"
import { attachPictures, checkQuestions, inferType, parseQuestionGrid, readCsvGrid, toBulkRow, pictureRef } from "./question-sheet"
import { normalizeQuestion } from "./question-input"
import { TEMPLATE_HEADER, TEMPLATE_ROWS } from "./question-sheet-excel"

const template = (...rows: string[][]) => [TEMPLATE_HEADER, ...rows]
const row = (fields: Partial<Record<(typeof TEMPLATE_HEADER)[number], string>>) => TEMPLATE_HEADER.map(h => fields[h] ?? "")

describe("parseQuestionGrid", () => {
    it("reads the template, including image columns", () => {
        const { questions } = parseQuestionGrid(template(...TEMPLATE_ROWS))
        expect(questions).toHaveLength(5)
        expect(questions[0]).toMatchObject({ row: 2, text: "What is 2+2?", options: ["1", "2", "3", "4"], correct: "D", type: "SINGLE", solution: "2+2 = 4" })
        expect(questions[2]).toMatchObject({ type: "INTEGER", correct: "10" })
        expect(questions[3].image).toBe("circuit1.png")
        expect(questions[4].optionImages).toEqual(["graphA.png", "graphB.png", "graphC.png", "graphD.png"])
    })

    it("accepts columns in any order and loose header names", () => {
        const grid = [["answer", "question", "a", "b", "Option_C", "question image"], ["B", "Pick B", "x", "y", "z", "https://ex.com/q.png"]]
        const [q] = parseQuestionGrid(grid).questions
        expect(q).toMatchObject({ text: "Pick B", options: ["x", "y", "z", ""], correct: "B", image: "https://ex.com/q.png", type: "SINGLE" })
    })

    it("still reads sample-questions.csv (subject, question, options, correct)", () => {
        const { questions } = parseQuestionGrid(readCsvGrid(readFileSync(path.join(__dirname, "..", "sample-questions.csv"), "utf8")))
        expect(questions[0]).toMatchObject({ text: "What is the unit of Force?", options: ["Newton", "Joule", "Watts", "Pascal"], correct: "Newton" })
    })

    it("still reads the old Text,A,B,C,D,Correct layout and keeps quoted commas", () => {
        const csv = 'Text,A,B,C,D,Correct,Difficulty,Type\n"What is 1,000 + 1?",1001,1000,999,0,1001,BEGINNER,SINGLE\r\n'
        const [q] = parseQuestionGrid(readCsvGrid(csv)).questions
        expect(q).toMatchObject({ text: "What is 1,000 + 1?", options: ["1001", "1000", "999", "0"], correct: "1001", difficulty: "BEGINNER" })
    })

    it("reads files with no header row by position", () => {
        const [q] = parseQuestionGrid([["2+3?", "4", "5", "6", "7", "B"]]).questions
        expect(q).toMatchObject({ row: 1, text: "2+3?", correct: "B", type: "SINGLE" })
    })

    it("skips blank rows and strips Excel's byte-order mark", () => {
        const { questions } = parseQuestionGrid(readCsvGrid("﻿Question Text,Correct Answer\n\n,\nHow many?,7\n"))
        expect(questions).toEqual([expect.objectContaining({ row: 4, text: "How many?", type: "INTEGER" })])
    })

    it("uses a cell's hyperlink for image columns only", () => {
        const grid = template(row({ "Question Text": "Q", "Correct Answer": "5", "Question Image": "diagram" }))
        const links = [[], TEMPLATE_HEADER.map(h => (h === "Question Image" || h === "Question Text" ? "https://ex.com/d.png" : undefined))]
        const [q] = parseQuestionGrid(grid, links).questions
        expect(q.image).toBe("https://ex.com/d.png")
        expect(q.text).toBe("Q")
    })
})

describe("inferType", () => {
    const opts = ["Newton", "Joule", "1,000", ""]
    it("no options → INTEGER", () => expect(inferType("", ["", "", "", ""], ["", "", "", ""], "12")).toBe("INTEGER"))
    it("image-only options still count as options", () => expect(inferType("", ["", "", "", ""], ["a.png", "b.png", "", ""], "A")).toBe("SINGLE"))
    it("several answers → MULTIPLE", () => expect(inferType("", opts, ["", "", "", ""], "A, B")).toBe("MULTIPLE"))
    it("an option text containing a comma stays SINGLE", () => expect(inferType("", opts, ["", "", "", ""], "1,000")).toBe("SINGLE"))
    it("understands common names", () => {
        expect(inferType("Multiple Correct", opts, [], "A")).toBe("MULTIPLE")
        expect(inferType("numerical", opts, [], "A")).toBe("INTEGER")
        expect(inferType("mcq", opts, [], "A")).toBe("SINGLE")
    })
    it("passes unknown types through for validation to reject", () => expect(inferType("essay", opts, [], "A")).toBe("ESSAY"))
})

describe("attachPictures", () => {
    const grid = template(row({ "Question Text": "Q1", "Option A": "x", "Option B": "y", "Correct Answer": "A" }), row({ "Question Text": "Q2", "Correct Answer": "4" }))
    const col = (h: string) => TEMPLATE_HEADER.indexOf(h)

    it("puts pictures into the slot of the column they sit over", () => {
        const parsed = parseQuestionGrid(grid)
        const problems = attachPictures(parsed, [
            { row: 1, col: col("Option B Image") },
            { row: 2, col: col("Question Text") },
            { row: 1, col: col("Option A") },
        ])
        expect(problems).toEqual([])
        expect(parsed.questions[0].optionImages).toEqual([pictureRef(2), pictureRef(0), "", ""])
        expect(parsed.questions[1].image).toBe(pictureRef(1))
    })

    it("reports pictures off the question rows or columns, and clashes", () => {
        const parsed = parseQuestionGrid(template(row({ "Question Text": "Q", "Correct Answer": "1", "Question Image": "a.png" })))
        const problems = attachPictures(parsed, [{ row: 0, col: 0 }, { row: 1, col: col("Difficulty") }, { row: 1, col: col("Question Image") }])
        expect(problems).toEqual([
            "The picture at cell A1 isn't on a question row in an image, question or option column",
            "The picture at cell H2 isn't on a question row in an image, question or option column",
            'Row 2: the question has both a picture and "a.png"; keep one',
        ])
    })
})

describe("checkQuestions", () => {
    const parse = (...rows: string[][]) => parseQuestionGrid(template(...rows)).questions

    it("accepts the template when its image files are selected", () => {
        const questions = parse(...TEMPLATE_ROWS)
        expect(checkQuestions(questions, ["circuit1.png", "GRAPHA.PNG", "graphB.png", "graphC.png", "graphD.png"])).toEqual([])
    })

    it("lists missing image files, matching by file name only", () => {
        const questions = parse(row({ "Question Text": "Q", "Correct Answer": "3", "Question Image": "pics\\q1.png" }))
        expect(checkQuestions(questions, [])).toEqual(['Row 2: image file "pics\\q1.png" not found. Select it along with the sheet'])
        expect(checkQuestions(questions, ["q1.png"])).toEqual([])
    })

    it("explains Excel pictures placed in a cell", () => {
        const questions = parse(row({ "Question Text": "Q", "Correct Answer": "3", "Question Image": "#VALUE!" }))
        expect(checkQuestions(questions, [])[0]).toMatch(/Place Picture over Cells/)
    })

    it("reports invalid answers with the sheet row", () => {
        const questions = parse(
            row({ "Question Text": "Q", "Option A": "x", "Option B": "y", "Correct Answer": "C" }),
            row({ "Question Text": "Q", "Option A": "x", "Option B": "y", "Correct Answer": "A,B", Type: "SINGLE" }),
            row({ "Question Text": "Q", "Correct Answer": "ten" }),
            row({ "Question Text": "Q", "Option A": "x", "Correct Answer": "A" }),
        )
        expect(checkQuestions(questions, [])).toEqual([
            "Row 2: The correct answer doesn't match any option",
            "Row 3: Single-correct questions need exactly one correct option",
            "Row 4: Integer questions need a numeric answer",
            "Row 5: Add at least two options (text or image)",
        ])
    })

    it("allows image-only questions and options", () => {
        const questions = parse(row({ "Option A Image": "a.png", "Option B Image": "b.png", "Correct Answer": "B", "Question Image": "https://ex.com/q.png" }))
        expect(checkQuestions(questions, ["a.png", "b.png"])).toEqual([])
    })
})

describe("toBulkRow", () => {
    it("produces rows the server stores with image URLs and answers", () => {
        const [single, multiple, integer] = parseQuestionGrid(template(
            row({ "Question Text": "Q", "Option A": "x", "Option B": "y", "Correct Answer": "B", "Option B Image": "y.png", "Question Image": "https://ex.com/q.png" }),
            row({ "Question Text": "Q", "Option A": "x", "Option B": "y", "Option C": "z", "Correct Answer": "A,C" }),
            row({ "Question Text": "Q", "Correct Answer": "-3.5", Difficulty: "advanced" }),
        )).questions
        const urls = (ref: string) => (ref === "y.png" ? "/api/assets/abc" : ref)
        expect(normalizeQuestion(toBulkRow(single, urls)).fields).toMatchObject({
            type: "SINGLE", correct: "y", imageUrl: "https://ex.com/q.png", optionBImageUrl: "/api/assets/abc", hasDiagram: true,
        })
        expect(normalizeQuestion(toBulkRow(multiple, urls)).fields).toMatchObject({ type: "MULTIPLE", correct: '["x","z"]' })
        expect(normalizeQuestion(toBulkRow(integer, urls)).fields).toMatchObject({ type: "INTEGER", correct: "-3.5", difficulty: "ADVANCED", options: "[]" })
    })
})
