import { db } from "@/lib/db"
import type { QuestionContext } from "@/lib/question-context"

/**
 * Checks that a question's tags fit together (the chapter is in the subject, the
 * subtopic in the chapter, the batch in the course) and fills in the subject,
 * chapter or course implied by a lower level. Returns the fixed context or an error.
 */
export async function resolveContext(ctx: QuestionContext): Promise<{ context?: QuestionContext; error?: string }> {
    const out = { ...ctx }
    if (out.subtopicId) {
        const st = await db.subtopic.findUnique({ where: { id: out.subtopicId }, select: { chapterId: true } })
        if (!st) return { error: "That subtopic no longer exists" }
        if (out.chapterId && out.chapterId !== st.chapterId) return { error: "The subtopic isn't in the chosen chapter" }
        out.chapterId = st.chapterId
    }
    if (out.chapterId) {
        const ch = await db.chapter.findUnique({ where: { id: out.chapterId }, select: { subjectId: true } })
        if (!ch) return { error: "That chapter no longer exists" }
        if (out.subjectId && out.subjectId !== ch.subjectId) return { error: "The chapter isn't in the chosen subject" }
        out.subjectId = ch.subjectId
    }
    if (out.batchId) {
        const b = await db.batch.findUnique({ where: { id: out.batchId }, select: { courseId: true } })
        if (!b) return { error: "That batch no longer exists" }
        if (out.courseId && out.courseId !== b.courseId) return { error: "The batch isn't in the chosen course" }
        out.courseId = b.courseId
    }
    return { context: out }
}

/** Exam / paper tag: trimmed, at most 120 characters, empty → null. */
export function cleanExamTag(v: unknown): string | null {
    if (typeof v !== "string") return null
    const s = v.trim().slice(0, 120)
    return s || null
}
