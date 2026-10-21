import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import path from "path"
import { parseQuestionCsv } from "./question-csv"

describe("parseQuestionCsv", () => {
    it("reads the positional layout and keeps commas inside quotes", () => {
        const csv = 'Text,A,B,C,D,Correct,Difficulty,Type\n"What is 1,000 + 1?",1001,1000,999,0,1001,BEGINNER,SINGLE\r\n'
        const [q] = parseQuestionCsv(csv)
        expect(q.text).toBe("What is 1,000 + 1?")
        expect(q.optionA).toBe("1001")
        expect(q.correct).toBe("1001")
        expect(q.difficulty).toBe("BEGINNER")
    })

    it("reads the bundled sample-questions.csv", () => {
        const csv = readFileSync(path.join(__dirname, "..", "sample-questions.csv"), "utf8")
        const rows = parseQuestionCsv(csv)
        expect(rows.length).toBeGreaterThan(0)
        expect(rows[0].text).toBe("What is the unit of Force?")
        expect(rows[0].optionA).toBe("Newton")
        expect(rows[0].correct).toBe("Newton")
    })
})
