// Combines per-batch AI results into importable question drafts.
// Pure functions (no browser APIs) so they can be unit tested.

import { MAX_OPTIONS, emptyDraft, type QuestionDraft } from "@/lib/question-input"
import type { Extraction, FigureRef, Box } from "./extraction"

export type ImportedQuestion = {
    key: string
    number: string
    page: number
    section: string | null
    draft: QuestionDraft
    questionFigure: FigureRef | null
    optionFigures: (FigureRef | null)[]
    warnings: string[]
}

const LETTERS = "ABCDEF"

/** Read an answer as printed: "B", "(A), (C)", "A and C", "AC" -> letters; "12", "Ans: 4.5" -> value. */
export function parseAnswer(raw: string | null | undefined): { letters: string[]; value: string | null } {
    const s = (raw ?? "").trim().replace(/^(ans(wer)?\.?|correct( option)?)\s*[:.\-–—]?\s*/i, "")
    if (!s) return { letters: [], value: null }

    // Option letters at the start, possibly followed by "— the answer text"
    const lead = /^\(?([A-F])\)?((?:\s*(?:,|&|and|\s)\s*\(?[A-F]\)?)*)(?=\s*(?:$|[—–\-:]|\s))/i.exec(s)
    if (lead) {
        const letters = Array.from(new Set((lead[1] + lead[2]).toUpperCase().match(/[A-F]/g) ?? []))
        return { letters: letters.sort(), value: null }
    }
    // Run-together letters like "AC" / "ABD"
    if (/^[A-F]{2,6}$/i.test(s)) return { letters: Array.from(new Set(s.toUpperCase().split(""))).sort(), value: null }

    const num = /[-−]?\d+(?:\.\d+)?/.exec(s)
    return { letters: [], value: num ? num[0].replace("−", "-") : null }
}

function union(figs: FigureRef[]): FigureRef | null {
    if (figs.length === 0) return null
    const page = figs[0].page
    const same = figs.filter(f => f.page === page)
    const box: Box = [
        Math.min(...same.map(f => f.box[0])),
        Math.min(...same.map(f => f.box[1])),
        Math.max(...same.map(f => f.box[2])),
        Math.max(...same.map(f => f.box[3])),
    ]
    return { page, box }
}

/**
 * Remove a "(A)" / "A." / "A)" label the model sometimes repeats inside option text.
 * A bare "A " is left alone: options often start with that word ("A is a weak electrolyte").
 */
export function stripLabel(text: string, label: string) {
    const l = label.replace(/[^A-Za-z0-9]/g, "")
    if (!l) return text
    return text.replace(new RegExp(`^(?:\\(${l}\\)|${l}[.)])\\s*`, "i"), "")
}

export function mergeExtractions(batches: Extraction[]): ImportedQuestion[] {
    const answers = new Map<string, { answer: string | null; solution: string | null }>()
    for (const b of batches) {
        for (const a of b.answers) {
            const prev = answers.get(a.number) ?? { answer: null, solution: null }
            answers.set(a.number, { answer: prev.answer ?? a.answer, solution: prev.solution ?? a.solution })
        }
    }

    const all = batches.flatMap(b => b.questions)
    const seen = new Map<string, number>()
    all.forEach(q => seen.set(q.number, (seen.get(q.number) ?? 0) + 1))

    return all.map((q, i): ImportedQuestion => {
        const warnings: string[] = []
        const key = answers.get(q.number)
        const parsed = parseAnswer(q.answer ?? key?.answer)
        const solution = q.solution ?? key?.solution ?? ""

        let type = q.type
        if (q.options.length === 0) type = "INTEGER"
        else if (parsed.letters.length > 1) type = "MULTIPLE"
        else if (type === "INTEGER") type = "SINGLE"

        const draft = emptyDraft(type)
        draft.text = q.text
        draft.solution = solution

        if (q.options.length > MAX_OPTIONS) warnings.push(`Has ${q.options.length} options; only A–D were kept`)
        const kept = q.options.slice(0, MAX_OPTIONS)
        kept.forEach((o, idx) => { draft.options[idx] = stripLabel(o.text, o.label) })
        const optionFigures: (FigureRef | null)[] = Array(MAX_OPTIONS).fill(null)
        kept.forEach((o, idx) => { optionFigures[idx] = o.figure })

        if (type === "INTEGER") {
            if (parsed.value !== null) draft.correct = [parsed.value]
            else warnings.push("No numeric answer found")
        } else {
            const valid = parsed.letters.filter(l => LETTERS.indexOf(l) < kept.length)
            draft.correct = type === "SINGLE" ? valid.slice(0, 1) : valid
            if (valid.length === 0) warnings.push("No answer found in the PDF")
        }

        const pages = new Set(q.figures.map(f => f.page))
        if (pages.size > 1) warnings.push("Diagram spans pages; only the first part was kept")
        if ((seen.get(q.number) ?? 0) > 1) warnings.push(`Question number ${q.number} appears more than once; check its answer`)

        return {
            key: `${q.page}-${q.number}-${i}`,
            number: q.number,
            page: q.page,
            section: q.section,
            draft,
            questionFigure: union(q.figures),
            optionFigures,
            warnings,
        }
    })
}
