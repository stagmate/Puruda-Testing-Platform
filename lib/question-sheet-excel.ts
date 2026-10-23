// Reads the first worksheet of an .xlsx file: cell texts, cell links, and pictures
// placed over cells. exceljs is loaded only when an Excel file is actually used.

import type { Workbook, Cell } from "exceljs"
import type { SheetPicture } from "@/lib/question-sheet"

export type ExcelSheet = {
    grid: string[][]
    links: (string | undefined)[][]
    pictures: (SheetPicture & { data: Uint8Array; extension: string })[]
}

async function newWorkbook(): Promise<Workbook> {
    const mod = await import("exceljs")
    const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
    return new ExcelJS.Workbook()
}

// Text as the teacher sees it. Formula cells give their result; rich text is joined.
function cellText(cell: Cell): string {
    const v = cell.value as unknown
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && v !== null && "error" in v) return String((v as { error: string }).error)
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    return cell.text ?? ""
}

function cellLink(cell: Cell): string | undefined {
    const v = cell.value as unknown
    if (v && typeof v === "object" && "hyperlink" in v) {
        const link = (v as { hyperlink?: unknown }).hyperlink
        return typeof link === "string" ? link : undefined
    }
    return undefined
}

export async function readExcelSheet(data: ArrayBuffer): Promise<ExcelSheet> {
    const workbook = await newWorkbook()
    await workbook.xlsx.load(data)
    const sheet = workbook.worksheets.find(ws => ws.state !== "hidden") ?? workbook.worksheets[0]
    if (!sheet) return { grid: [], links: [], pictures: [] }

    const grid: string[][] = []
    const links: (string | undefined)[][] = []
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const r = rowNumber - 1
        grid[r] = []
        links[r] = []
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            grid[r][colNumber - 1] = cellText(cell)
            links[r][colNumber - 1] = cellLink(cell)
        })
    })
    // eachRow skips rows that were never written; fill the gaps so row numbers line up.
    for (let r = 0; r < grid.length; r++) {
        grid[r] ??= []
        links[r] ??= []
    }

    const pictures = sheet.getImages().flatMap(img => {
        const media = workbook.getImage(Number(img.imageId))
        if (!media?.buffer) return []
        return [{
            row: Math.floor(img.range.tl.nativeRow),
            col: Math.floor(img.range.tl.nativeCol),
            data: new Uint8Array(media.buffer as ArrayBuffer),
            extension: media.extension || "png",
        }]
    })
    return { grid, links, pictures }
}

export const TEMPLATE_HEADER = [
    "Question Text", "Option A", "Option B", "Option C", "Option D", "Correct Answer",
    "Type", "Difficulty", "Solution", "Question Image", "Option A Image", "Option B Image", "Option C Image", "Option D Image",
]

export const TEMPLATE_ROWS = [
    ["What is 2+2?", "1", "2", "3", "4", "D", "SINGLE", "BEGINNER", "2+2 = 4", "", "", "", "", ""],
    ["Which are noble gases?", "He", "O_{2}", "Ne", "N_{2}", "A,C", "MULTIPLE", "INTERMEDIATE", "", "", "", "", "", ""],
    ["How many electrons does O^{2-} have?", "", "", "", "", "10", "INTEGER", "BEGINNER", "8 + 2 = 10", "", "", "", "", ""],
    ["Identify the circuit shown.", "Series", "Parallel", "", "", "B", "SINGLE", "INTERMEDIATE", "", "circuit1.png", "", "", "", ""],
    ["Which graph shows uniform motion?", "", "", "", "", "A", "SINGLE", "ADVANCED", "", "", "graphA.png", "graphB.png", "graphC.png", "graphD.png"],
]

const HELP = [
    ["How to fill in this sheet"],
    [""],
    ["Type", "SINGLE (one correct option), MULTIPLE (one or more correct options) or INTEGER (a number, no options). Leave blank to work it out automatically."],
    ["Correct Answer", "SINGLE: a letter (B) or the option text. MULTIPLE: letters separated by commas (A,C). INTEGER: the number (10 or 2.5)."],
    ["Options", "Fill two to four options. An option can be text, an image, or both."],
    ["Images", "Three ways, mix as you like:"],
    ["", "1. Type a file name (circuit1.png) in an image column, then choose those image files together with this sheet when uploading."],
    ["", "2. Paste a picture into the image cell (Insert → Pictures → Place over Cells). Pictures over the question or option cell work too."],
    ["", "3. Paste a web link to an image (https://…/image.png). The link must open the image itself."],
    ["Limits", "Up to 500 questions per upload; each image up to 5 MB (PNG, JPEG, GIF or WebP)."],
]

/** An .xlsx template with example rows, dropdowns for Type and Difficulty, and a help sheet. */
export async function buildExcelTemplate(): Promise<Blob> {
    const workbook = await newWorkbook()
    const sheet = workbook.addWorksheet("Questions")
    sheet.addRow(TEMPLATE_HEADER).font = { bold: true }
    TEMPLATE_ROWS.forEach(r => sheet.addRow(r))
    sheet.columns.forEach((col, i) => { col.width = i === 0 ? 40 : i >= 8 ? 18 : 14 })
    sheet.views = [{ state: "frozen", ySplit: 1 }]
    for (let r = 2; r <= 501; r++) {
        sheet.getCell(r, 7).dataValidation = { type: "list", allowBlank: true, formulae: ['"SINGLE,MULTIPLE,INTEGER"'] }
        sheet.getCell(r, 8).dataValidation = { type: "list", allowBlank: true, formulae: ['"BEGINNER,INTERMEDIATE,ADVANCED"'] }
    }
    const help = workbook.addWorksheet("Help")
    HELP.forEach(r => help.addRow(r))
    help.getColumn(1).width = 18
    help.getColumn(2).width = 110
    help.getRow(1).font = { bold: true, size: 14 }
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}
