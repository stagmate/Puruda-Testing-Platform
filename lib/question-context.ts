// Course / subject / chapter tags sent with a question. Empty strings and the
// UI's "all" placeholder mean "not set".
export type QuestionContext = {
    courseId: string | null
    batchId: string | null
    subjectId: string | null
    chapterId: string | null
    subtopicId: string | null
}

const clean = (v: unknown) => (typeof v === "string" && v && v !== "all" ? v : null)

export function cleanContext(raw: Record<string, unknown> | null | undefined): QuestionContext {
    const r = raw ?? {}
    return {
        courseId: clean(r.courseId),
        batchId: clean(r.batchId),
        subjectId: clean(r.subjectId),
        chapterId: clean(r.chapterId),
        subtopicId: clean(r.subtopicId),
    }
}
