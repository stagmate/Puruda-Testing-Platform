// @vitest-environment node
import { describe, it, expect } from "vitest"
import ExcelJS from "exceljs"
import { buildExcelTemplate, readExcelSheet, TEMPLATE_HEADER } from "./question-sheet-excel"
import { attachPictures, checkQuestions, parseQuestionGrid, pictureRef } from "./question-sheet"

// 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")
const toArrayBuffer = (data: ArrayBuffer | Uint8Array): ArrayBuffer => new Uint8Array(data).slice().buffer

describe("readExcelSheet", () => {
    it("reads cells, numbers, links and pictures pasted over cells", async () => {
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet("Questions")
        ws.addRow(TEMPLATE_HEADER)
        ws.addRow(["Which graph?", "", "", "", "", "B", "", "", "", "", "a.png"])
        ws.addRow(["How many?", "", "", "", "", 12, "", "", "", { text: "diagram", hyperlink: "https://ex.com/d.png" }])
        const imageId = wb.addImage({ buffer: PNG as unknown as ExcelJS.Buffer, extension: "png" })
        // Over "Option B Image" (column L) on row 2
        ws.addImage(imageId, { tl: { col: TEMPLATE_HEADER.indexOf("Option B Image"), row: 1 }, ext: { width: 40, height: 40 } })

        const sheet = await readExcelSheet(toArrayBuffer(new Uint8Array(await wb.xlsx.writeBuffer() as unknown as ArrayBuffer)))
        expect(sheet.pictures).toHaveLength(1)
        expect(sheet.pictures[0]).toMatchObject({ row: 1, col: TEMPLATE_HEADER.indexOf("Option B Image"), extension: "png" })
        expect(Buffer.from(sheet.pictures[0].data).equals(PNG)).toBe(true)

        const parsed = parseQuestionGrid(sheet.grid, sheet.links)
        expect(attachPictures(parsed, sheet.pictures)).toEqual([])
        const [graph, count] = parsed.questions
        expect(graph).toMatchObject({ type: "SINGLE", optionImages: ["a.png", pictureRef(0), "", ""] })
        expect(count).toMatchObject({ type: "INTEGER", correct: "12", image: "https://ex.com/d.png" })
        expect(checkQuestions(parsed.questions, ["a.png"])).toEqual([])
    })

    it("builds a template that reads back as valid questions", async () => {
        const blob = await buildExcelTemplate()
        const sheet = await readExcelSheet(await blob.arrayBuffer())
        const { questions } = parseQuestionGrid(sheet.grid, sheet.links)
        expect(questions.map(q => q.type)).toEqual(["SINGLE", "MULTIPLE", "INTEGER", "SINGLE", "SINGLE"])
        expect(checkQuestions(questions, ["circuit1.png", "graphA.png", "graphB.png", "graphC.png", "graphD.png"])).toEqual([])
    })
})
