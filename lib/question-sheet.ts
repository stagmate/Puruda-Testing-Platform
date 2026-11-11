// Reads question rows from a spreadsheet grid (CSV or the first Excel sheet).
// Pure logic, shared by the CSV and Excel readers and covered by tests.
//
// Images can come from three places, all optional:
//  - a web link in an image column (https://…)
//  - a file name in an image column (q1.png), matched to image files the user selects
//  - a picture pasted into Excel over a cell (handled by the Excel reader, see question-sheet-excel.ts)

import Papa from "papaparse"
import { resolveOptionIndex } from "@/lib/grading"
import { MAX_OPTIONS, normalizeQuestion, type QuestionType } from "@/lib/question-input"

export const OPTION_KEYS = ["A", "B", "C", "D"] as const

/** One question as read from the sheet; image fields hold the cell text (link or file name). */
export type SheetQuestion = {
    row: number                         // 1-based row number in the sheet, for messages
    text: string
    options: string[]                   // A–D, "" when empty
    correct: string
    difficulty?: string
    type: QuestionType
    solution?: string
    image: string                       // question image ref, "" when none
    optionImages: string[]              // A–D refs, "" when none
}

/** A picture placed over a sheet cell (0-based row and column of its top-left corner). */
export type SheetPicture = { row: number; col: number }

/** Which grid cell each field came from, so pasted Excel pictures can be matched to a slot. */
export type ImageSlot = { kind: "question" } | { kind: "option"; index: number }

export type ParsedSheet = {
    questions: SheetQuestion[]
    /** Maps a 0-based column to the image slot a picture over that column belongs to. */
    imageSlotForColumn: (col: number) => ImageSlot | null
    /** 0-based grid row of each question, same order as `questions`. */
    gridRows: number[]
}

// Header names are compared lowercased with spaces, dashes and underscores removed.
const key = (h: unknown) => String(h ?? "").toLowerCase().replace(/[\s_\-().:]/g, "")

const HEADERS: Record<string, string[]> = {
    text: ["questiontext", "question", "text"],
    options: ["options"],
    correct: ["correctanswer", "correct", "answer", "answers", "correctoption", "correctoptions"],
    difficulty: ["difficulty", "level"],
    type: ["type", "questiontype"],
    solution: ["solution", "explanation"],
    image: ["questionimage", "image", "imageurl", "questionimageurl", "diagram"],
    ...Object.fromEntries(OPTION_KEYS.map(L => [`option${L}`, [`option${L.toLowerCase()}`, L.toLowerCase()]])),
    ...Object.fromEntries(OPTION_KEYS.map(L => [`option${L}Image`, [`option${L.toLowerCase()}image`, `option${L.toLowerCase()}imageurl`, `${L.toLowerCase()}image`]])),
}

function findColumns(header: string[]): Record<string, number> {
    const cols: Record<string, number> = {}
    const keys = header.map(key)
    for (const [field, names] of Object.entries(HEADERS)) {
        const idx = keys.findIndex(k => names.includes(k))
        if (idx !== -1) cols[field] = idx
    }
    return cols
}

const TYPE_ALIASES: Record<string, QuestionType> = {
    single: "SINGLE", singlecorrect: "SINGLE", mcq: "SINGLE", scq: "SINGLE",
    multiple: "MULTIPLE", multiplecorrect: "MULTIPLE", multi: "MULTIPLE", msq: "MULTIPLE", mcqmultiple: "MULTIPLE",
    integer: "INTEGER", numerical: "INTEGER", numeric: "INTEGER", number: "INTEGER", int: "INTEGER",
}

/**
 * The question type from the Type column, or worked out from the row when it's blank:
 * no options → INTEGER; more than one correct option ("A,C") → MULTIPLE; else SINGLE.
 * An unknown Type value is passed through so validation reports it.
 */
export function inferType(typeCell: string, options: string[], optionImages: string[], correct: string): QuestionType {
    const given = typeCell.trim()
    if (given) return TYPE_ALIASES[key(given)] ?? (given.toUpperCase() as QuestionType)
    const hasOptions = options.some((o, i) => o || optionImages[i])
    if (!hasOptions) return "INTEGER"
    const answer = correct.trim()
    if (resolveOptionIndex(answer, options) === -1 && /[,|;]/.test(answer)) {
        const parts = answer.split(/[,|;]/).map(t => t.trim()).filter(Boolean)
        if (parts.length > 1) return "MULTIPLE"
    }
    return "SINGLE"
}

const cell = (row: string[], col: number | undefined) => (col === undefined ? "" : String(row[col] ?? "").trim())

/**
 * Parse a grid of cell texts. Three layouts are accepted:
 *  1. Named columns (the template): Question Text, Option A–D, Correct Answer, Difficulty, Type,
 *     Solution, Question Image, Option A–D Image. Any order; only Question Text/Image and Correct are needed.
 *  2. The sample-questions.csv layout: subject, question, options ("A|B|C|D"), correct
 *  3. Old positional files with no recognisable header: Text, A, B, C, D, Correct, Difficulty, Type
 */
export function parseQuestionGrid(grid: string[][], links: (string | undefined)[][] = []): ParsedSheet {
    const rows = grid.map(r => Array.from(r, c => String(c ?? "")))
    // Skip blank rows above the header.
    let start = 0
    while (start < rows.length && rows[start].every(c => !c.trim())) start++
    const header = rows[start] ?? []
    const cols = findColumns(header)
    const hasHeader = cols.text !== undefined || cols.image !== undefined

    const positional = { text: 0, optionA: 1, optionB: 2, optionC: 3, optionD: 4, correct: 5, difficulty: 6, type: 7 } as Record<string, number>
    const use = hasHeader ? cols : positional
    const firstData = hasHeader ? start + 1 : start

    const imageSlotForColumn = (col: number): ImageSlot | null => {
        if (col === use.image || col === use.text) return { kind: "question" }
        for (let i = 0; i < MAX_OPTIONS; i++) {
            if (col === use[`option${OPTION_KEYS[i]}Image`] || col === use[`option${OPTION_KEYS[i]}`]) return { kind: "option", index: i }
        }
        return null
    }

    const questions: SheetQuestion[] = []
    const gridRows: number[] = []
    for (let r = firstData; r < rows.length; r++) {
        const row = rows[r]
        if (row.every(c => !c.trim())) continue
        if (!hasHeader && row.length < 6) continue

        let options = OPTION_KEYS.map(L => cell(row, use[`option${L}`]))
        if (use.options !== undefined && options.every(o => !o)) {
            const listed = cell(row, use.options).split("|").map(o => o.trim())
            options = OPTION_KEYS.map((_, i) => listed[i] ?? "")
        }
        // In image columns a linked cell (Excel hyperlink) counts as its link.
        const imageRef = (col: number | undefined) => {
            const link = col === undefined ? undefined : links[r]?.[col]
            return link && isWebLink(link) ? link : cell(row, col)
        }
        const optionImages = OPTION_KEYS.map(L => imageRef(use[`option${L}Image`]))
        const correct = cell(row, use.correct)
        questions.push({
            row: r + 1,
            text: cell(row, use.text),
            options,
            correct,
            difficulty: cell(row, use.difficulty) || undefined,
            type: inferType(cell(row, use.type), options, optionImages, correct),
            solution: cell(row, use.solution) || undefined,
            image: imageRef(use.image),
            optionImages,
        })
        gridRows.push(r)
    }
    return { questions, imageSlotForColumn, gridRows }
}

export const isWebLink = (ref: string) => /^https?:\/\//i.test(ref.trim())

/** Internal reference for a picture pasted into Excel (index into the pictures list). */
export const pictureRef = (i: number) => `excel-picture:${i}`
export const pictureIndex = (ref: string) => (ref.startsWith("excel-picture:") ? Number(ref.slice(14)) : -1)

/** A CSV file as a grid of cell texts. Quoted fields with commas or line breaks are handled. */
export function readCsvGrid(csv: string): string[][] {
    const text = csv.replace(/^\uFEFF/, "") // Excel adds a byte-order mark to "CSV UTF-8" files
    // Blank lines are kept (and skipped later) so row numbers in messages match the file.
    return Papa.parse<string[]>(text).data
}

/**
 * Put pictures pasted into Excel into the question/option image they sit over.
 * Changes `parsed.questions` in place; returns problems for pictures that don't fit anywhere.
 */
export function attachPictures(parsed: ParsedSheet, pictures: SheetPicture[]): string[] {
    const problems: string[] = []
    const cellName = (p: SheetPicture) => `${columnLetter(p.col)}${p.row + 1}`
    pictures.forEach((pic, i) => {
        const qi = parsed.gridRows.indexOf(pic.row)
        const slot = parsed.imageSlotForColumn(pic.col)
        if (qi === -1 || !slot) {
            problems.push(`The picture at cell ${cellName(pic)} isn't on a question row in an image, question or option column`)
            return
        }
        const q = parsed.questions[qi]
        const current = slot.kind === "question" ? q.image : q.optionImages[slot.index]
        if (current && !current.startsWith("#")) {
            const where = slot.kind === "question" ? "question" : `option ${OPTION_KEYS[slot.index]}`
            problems.push(`Row ${q.row}: the ${where} has both a picture and "${current}"; keep one`)
            return
        }
        if (slot.kind === "question") q.image = pictureRef(i)
        else q.optionImages[slot.index] = pictureRef(i)
    })
    return problems
}

function columnLetter(col: number): string {
    let s = ""
    for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
    return s
}

/**
 * Everything that would stop the upload, found before any image is uploaded:
 * invalid questions, image files that weren't selected, and Excel's in-cell pictures.
 */
export function checkQuestions(questions: SheetQuestion[], selectedFileNames: string[]): string[] {
    const available = new Set(selectedFileNames.map(fileKey))
    const problems: string[] = []
    for (const q of questions) {
        const refs = [q.image, ...q.optionImages].filter(Boolean)
        const inCell = refs.find(ref => ref.startsWith("#"))
        if (inCell) {
            problems.push(`Row ${q.row}: a picture is placed in a cell (shows as ${inCell}). In Excel, right-click it → Place Picture over Cells`)
            continue
        }
        const missing = refs.filter(ref => !isWebLink(ref) && pictureIndex(ref) === -1 && !available.has(fileKey(ref)))
        if (missing.length) {
            problems.push(`Row ${q.row}: image file ${missing.map(m => `"${m}"`).join(", ")} not found. Select it along with the sheet`)
            continue
        }
        // Validate with a stand-in URL for each image; real URLs come after upload.
        const { error } = normalizeQuestion(toBulkRow(q, () => "/pending-upload"))
        if (error) problems.push(`Row ${q.row}: ${error}`)
    }
    return problems
}

/** File name part of a reference like "images/q1.png" or "C:\\pics\\q1.png", lowercased for matching. */
export const fileKey = (ref: string) => ref.trim().split(/[\\/]/).pop()!.toLowerCase()

/** Every image file name the sheet refers to (not web links), for checking against the selected files. */
export function referencedFileNames(questions: SheetQuestion[]): string[] {
    const names = new Set<string>()
    for (const q of questions) {
        for (const ref of [q.image, ...q.optionImages]) if (ref && !isWebLink(ref)) names.add(fileKey(ref))
    }
    return [...names]
}

/** Row for the bulk-save API, with image refs replaced by stored URLs via `urlFor`. */
export function toBulkRow(q: SheetQuestion, urlFor: (ref: string) => string | null) {
    const resolve = (ref: string) => (ref ? urlFor(ref) : null)
    return {
        type: q.type,
        text: q.text,
        options: q.options,
        optionImages: q.optionImages.map(resolve),
        correct: q.correct,
        difficulty: q.difficulty,
        solution: q.solution,
        imageUrl: resolve(q.image),
    }
}
