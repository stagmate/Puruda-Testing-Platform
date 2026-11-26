"use client"

import { useState } from "react"
import { Loader2, FolderTree, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuestionEditor, draftError } from "./question-editor"
import { ClassificationFields, toContext, type BankMeta, type Classification } from "./classification"
import { readError, send } from "@/components/admin/kit"
import { draftFromQuestion, emptyDraft, type QuestionDraft } from "@/lib/question-input"

export type StoredQuestion = Parameters<typeof draftFromQuestion>[0] & {
    id: string
    subjectId?: string | null
    chapterId?: string | null
    subtopicId?: string | null
    courseId?: string | null
    batchId?: string | null
    examTag?: string | null
    createdAt?: string
    subject?: { name: string } | null
    chapter?: { name: string } | null
    subtopic?: { name: string } | null
    course?: { name: string } | null
    batch?: { name: string } | null
    _count?: { tests: number }
}

const classificationOf = (q: StoredQuestion): Classification => ({
    subjectId: q.subjectId ?? "", chapterId: q.chapterId ?? "", subtopicId: q.subtopicId ?? "",
    courseId: q.courseId ?? "", batchId: q.batchId ?? "",
})

/**
 * Add a new question, or edit every part of an existing one: where it's filed
 * (subject, chapter, subtopic, course, batch, exam tag) and its content.
 */
export function QuestionFormDialog({ open, question, defaults, meta, onClose, onSaved }: {
    open: boolean
    /** The question to edit, or null to add a new one. */
    question: StoredQuestion | null
    /** Where a new question is filed by default (e.g. the active filters). */
    defaults: Classification
    meta: BankMeta
    onClose: () => void
    onSaved: (saved: StoredQuestion) => void
}) {
    const [place, setPlace] = useState<Classification>(defaults)
    const [examTag, setExamTag] = useState("")
    const [draft, setDraft] = useState<QuestionDraft>(emptyDraft())
    const [showErrors, setShowErrors] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")

    // Reset the form whenever the dialog opens for a (different) question.
    const key = open ? (question?.id ?? "new") : null
    const [lastKey, setLastKey] = useState<string | null>(null)
    if (key !== lastKey) {
        setLastKey(key)
        setPlace(question ? classificationOf(question) : defaults)
        setExamTag(question?.examTag ?? "")
        setDraft(question ? draftFromQuestion(question) : emptyDraft())
        setShowErrors(false)
        setError("")
        setNotice("")
    }

    const save = async (addAnother: boolean) => {
        setShowErrors(true)
        setError("")
        setNotice("")
        if (!place.subjectId) return setError("Choose a subject.")
        if (draftError(draft)) return
        setBusy(true)
        const body = { ...draft, ...toContext(place), examTag }
        const res = question ? await send(`/api/admin/questions/${question.id}`, "PATCH", body) : await send("/api/admin/questions", "POST", body)
        setBusy(false)
        if (!res?.ok) return setError(await readError(res, "Couldn't save the question"))
        const saved: StoredQuestion = await res.json()
        onSaved(saved)
        if (addAnother) {
            // Keep where it's filed, the type and difficulty; clear the rest.
            setDraft({ ...emptyDraft(draft.type), difficulty: draft.difficulty })
            setShowErrors(false)
            setNotice("Saved. Add the next question.")
        } else {
            onClose()
        }
    }

    return (
        <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose() }}>
            <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl" onInteractOutside={e => e.preventDefault()}>
                <DialogHeader className="border-b px-5 py-4">
                    <DialogTitle className="text-lg">{question ? "Edit question" : "Add question"}</DialogTitle>
                    <DialogDescription>
                        {question?._count?.tests ? `Used in ${question._count.tests} test${question._count.tests === 1 ? "" : "s"}; changes show there too.` : "Choose a subject; chapter, subtopic, course and batch are optional."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FolderTree className="h-4 w-4 text-indigo-500" />Where it&apos;s filed</h3>
                        <ClassificationFields value={place} onChange={setPlace} meta={meta} mode="assign" />
                        <div className="space-y-1 sm:max-w-sm">
                            <label htmlFor="q-exam-tag" className="text-sm font-medium text-slate-800">Exam / paper tag <span className="font-normal text-slate-500">(optional)</span></label>
                            <Input id="q-exam-tag" value={examTag} onChange={e => setExamTag(e.target.value)} placeholder="e.g. JEE Main 2025 Shift 1" className="bg-white" />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileQuestion className="h-4 w-4 text-indigo-500" />Question</h3>
                        <QuestionEditor value={draft} onChange={setDraft} showErrors={showErrors} />
                    </section>
                </div>

                <div className="flex flex-col gap-2 border-t bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-h-5 text-sm">
                        {error && <span className="text-red-700" role="alert">{error}</span>}
                        {!error && notice && <span className="text-emerald-700" role="status">{notice}</span>}
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                        {!question && <Button variant="secondary" onClick={() => save(true)} disabled={busy}>Save &amp; add another</Button>}
                        <Button onClick={() => save(false)} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{question ? "Save changes" : "Save question"}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
