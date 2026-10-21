// Shape of what the AI returns for a batch of PDF pages, plus a sanitiser that
// makes the (untrusted) model output safe to use.

export type Box = [number, number, number, number] // [ymin, xmin, ymax, xmax], 0–1000 of the page
export type FigureRef = { page: number; box: Box }

export type ExtractedOption = { label: string; text: string; figure: FigureRef | null }

export type ExtractedQuestion = {
    number: string
    page: number
    section: string | null
    text: string
    type: "SINGLE" | "MULTIPLE" | "INTEGER"
    options: ExtractedOption[]
    figures: FigureRef[]
    answer: string | null
    solution: string | null
}

export type ExtractedAnswer = { number: string; answer: string | null; solution: string | null }

export type Extraction = { questions: ExtractedQuestion[]; answers: ExtractedAnswer[] }

const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const optStr = (v: unknown, max = 5000) => str(v, max) || null

function box(v: unknown): Box | null {
    if (!Array.isArray(v) || v.length !== 4) return null
    const n = v.map(x => Math.min(1000, Math.max(0, Math.round(Number(x)))))
    if (n.some(x => !Number.isFinite(x))) return null
    const [y1, x1, y2, x2] = n
    if (y2 - y1 < 5 || x2 - x1 < 5) return null // too small to be a real picture
    return [y1, x1, y2, x2]
}

function figure(v: unknown, pages: Set<number>): FigureRef | null {
    if (!v || typeof v !== "object") return null
    const o = v as Record<string, unknown>
    const page = Math.round(Number(o.page))
    const b = box(o.box)
    return b && pages.has(page) ? { page, box: b } : null
}

/** Clean up model output: drop malformed entries, clamp boxes, keep figures on pages we actually sent. */
export function sanitizeExtraction(raw: unknown, sentPages: number[]): Extraction {
    const pages = new Set(sentPages)
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>

    const questions: ExtractedQuestion[] = (Array.isArray(obj.questions) ? obj.questions : [])
        .slice(0, 300)
        .map((q: Record<string, unknown>): ExtractedQuestion | null => {
            if (!q || typeof q !== "object") return null
            const text = str(q.text)
            const options = (Array.isArray(q.options) ? q.options : []).slice(0, 6).map((o: Record<string, unknown>, i: number) => ({
                label: str(o?.label, 5) || "ABCDEF"[i],
                text: str(o?.text, 1000),
                figure: figure(o?.figure, pages),
            }))
            const figures = (Array.isArray(q.figures) ? q.figures : []).map(f => figure(f, pages)).filter((f): f is FigureRef => !!f).slice(0, 4)
            if (!text && figures.length === 0) return null
            const type = q.type === "MULTIPLE" || q.type === "INTEGER" ? q.type : "SINGLE"
            return {
                number: str(q.number, 20),
                page: Math.round(Number(q.page)) || sentPages[0],
                section: optStr(q.section, 200),
                text,
                type,
                options,
                figures,
                answer: optStr(q.answer, 100),
                solution: optStr(q.solution),
            }
        })
        .filter((q): q is ExtractedQuestion => !!q)

    const answers: ExtractedAnswer[] = (Array.isArray(obj.answers) ? obj.answers : [])
        .slice(0, 500)
        .map((a: Record<string, unknown>) => ({ number: str(a?.number, 20), answer: optStr(a?.answer, 100), solution: optStr(a?.solution) }))
        .filter(a => a.number && (a.answer || a.solution))

    return { questions, answers }
}

export type PageSize = { page: number; width: number; height: number }

/**
 * The AI gives picture boxes in pixels of the page image it saw ({x1,y1,x2,y2}).
 * Return a copy with them converted to [ymin, xmin, ymax, xmax] on a 0–1000 scale of that
 * page, which is what sanitizeExtraction and the cropper use. Unknown pages or
 * malformed boxes become null and are dropped by the sanitiser.
 */
export function pixelBoxesToNormalized(raw: unknown, sizes: PageSize[]): unknown {
    const dims = new Map(sizes.map(s => [s.page, s]))
    const convert = (fig: unknown) => {
        if (!fig || typeof fig !== "object") return null
        const f = fig as { page?: unknown; box?: unknown }
        const size = dims.get(Math.round(Number(f.page)))
        const b = f.box as Record<string, unknown> | null
        if (!size || !b || typeof b !== "object") return null
        const [x1, y1, x2, y2] = [b.x1, b.y1, b.x2, b.y2].map(Number)
        if (![x1, y1, x2, y2].every(Number.isFinite)) return null
        const nx = (x: number) => Math.round((x / size.width) * 1000)
        const ny = (y: number) => Math.round((y / size.height) * 1000)
        return {
            page: size.page,
            box: [ny(Math.min(y1, y2)), nx(Math.min(x1, x2)), ny(Math.max(y1, y2)), nx(Math.max(x1, x2))],
        }
    }
    const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
    const questions = Array.isArray(obj.questions) ? obj.questions : []
    return {
        ...obj,
        questions: questions.map((q: Record<string, unknown>) => ({
            ...q,
            figures: Array.isArray(q?.figures) ? q.figures.map(convert) : [],
            options: Array.isArray(q?.options)
                ? q.options.map((o: Record<string, unknown>) => ({ ...o, figure: convert(o?.figure) }))
                : [],
        })),
    }
}
