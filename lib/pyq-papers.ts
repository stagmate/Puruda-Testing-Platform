// Server helpers for PYQ papers (admin side).

import { db } from "@/lib/db"
import { normalizeScheme } from "@/lib/marking"
import { encodeQuestionOrder } from "@/lib/test-order"
import { parseIds } from "@/lib/pyq"

export type PaperInput = { exam: string; year: number; session: string; title: string; duration: number; markingScheme: string }

/** Validates the editable fields of a paper. Missing fields are left out (for PATCH). */
export function readPaper(body: Record<string, unknown>, partial: boolean): { data?: Partial<PaperInput>; error?: string } {
    const data: Partial<PaperInput> = {}
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "")
    if (!partial || body.exam !== undefined) {
        data.exam = text(body.exam, 60)
        if (!data.exam) return { error: "Enter the exam (e.g. JEE Main)" }
    }
    if (!partial || body.year !== undefined) {
        const y = Number(body.year)
        if (!Number.isInteger(y) || y < 1990 || y > 2100) return { error: "Enter a valid year" }
        data.year = y
    }
    if (!partial || body.session !== undefined) data.session = text(body.session, 80)
    if (!partial || body.duration !== undefined) {
        const d = Number(body.duration ?? 180)
        if (!Number.isInteger(d) || d < 5 || d > 600) return { error: "Duration must be 5 to 600 minutes" }
        data.duration = d
    }
    if (!partial || body.marking !== undefined) data.markingScheme = JSON.stringify(normalizeScheme(body.marking ?? "JEE_MAIN"))
    if (!partial || body.title !== undefined || data.exam || data.year || data.session !== undefined) {
        const t = text(body.title, 200)
        if (t) data.title = t
    }
    return { data }
}

export function defaultTitle(p: { exam: string; year: number; session: string }) {
    return [p.exam, p.year, p.session].filter(Boolean).join(" · ")
}

/**
 * Files every question with this exam tag under the paper, appending them to
 * its order (oldest first). Questions already in another paper are moved.
 */
export async function attachByTag(paperId: string, tag: string) {
    const questions = await db.question.findMany({ where: { examTag: tag }, select: { id: true }, orderBy: { createdAt: "asc" } })
    if (questions.length === 0) return 0
    const paper = await db.pyqPaper.findUnique({ where: { id: paperId }, select: { questionOrder: true } })
    const order = parseIds(paper?.questionOrder)
    const ids = questions.map(q => q.id)
    await db.$transaction([
        db.question.updateMany({ where: { id: { in: ids } }, data: { pyqPaperId: paperId } }),
        db.pyqPaper.update({ where: { id: paperId }, data: { questionOrder: encodeQuestionOrder([...order, ...ids]) } }),
    ])
    return ids.length
}

export const paperSummary = {
    id: true, exam: true, year: true, session: true, title: true, duration: true, markingScheme: true, isPublished: true, createdAt: true,
    _count: { select: { questions: true, attempts: true } },
} as const
