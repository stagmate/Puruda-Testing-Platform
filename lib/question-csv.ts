import Papa from "papaparse"

export type CsvQuestion = {
    text: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correct: string
    difficulty?: string
    type?: string
}

/**
 * Parse a question CSV. Two layouts are accepted:
 *  1. Columns: Text, OptionA, OptionB, OptionC, OptionD, Correct, Difficulty, Type
 *  2. The sample-questions.csv layout with a header: subject, question, options ("A|B|C|D"), correct
 * Quoted fields (with commas or newlines inside) are handled.
 */
export function parseQuestionCsv(csv: string): CsvQuestion[] {
    const { data } = Papa.parse<string[]>(csv.trim(), { skipEmptyLines: true })
    if (data.length === 0) return []

    const header = data[0].map(h => String(h).trim().toLowerCase())
    const qCol = header.indexOf("question")
    const optCol = header.indexOf("options")

    if (qCol !== -1 && optCol !== -1) {
        const cCol = header.indexOf("correct")
        const dCol = header.indexOf("difficulty")
        const tCol = header.indexOf("type")
        return data.slice(1).map(row => {
            const opts = String(row[optCol] ?? "").split("|").map(o => o.trim())
            return {
                text: String(row[qCol] ?? "").trim(),
                optionA: opts[0] ?? "",
                optionB: opts[1] ?? "",
                optionC: opts[2] ?? "",
                optionD: opts[3] ?? "",
                correct: String(row[cCol] ?? "").trim(),
                difficulty: dCol !== -1 ? String(row[dCol] ?? "").trim() || undefined : undefined,
                type: tCol !== -1 ? String(row[tCol] ?? "").trim() || undefined : undefined,
            }
        }).filter(q => q.text)
    }

    // Positional layout; skip the first row when it is a header.
    const looksLikeHeader = /text|question/.test(header[0] ?? "")
    return data.slice(looksLikeHeader ? 1 : 0)
        .filter(cols => cols.length >= 6)
        .map(cols => ({
            text: cols[0]?.trim(),
            optionA: cols[1]?.trim(),
            optionB: cols[2]?.trim(),
            optionC: cols[3]?.trim(),
            optionD: cols[4]?.trim(),
            correct: cols[5]?.trim(),
            difficulty: cols[6]?.trim() || undefined,
            type: cols[7]?.trim() || undefined,
        }))
        .filter(q => q.text)
}
