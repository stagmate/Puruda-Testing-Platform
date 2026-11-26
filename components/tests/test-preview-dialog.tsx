"use client"

import { type ReactNode } from "react"
import { Clock, FileQuestion, Trophy, Users, CalendarClock, Scale, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuestionView } from "@/components/question-bank/question-view"
import { TYPE_LABEL, DIFFICULTY, topicPath } from "@/components/question-bank/question-card"
import type { StoredQuestion } from "@/components/question-bank/question-form-dialog"
import { draftFromQuestion } from "@/lib/question-input"
import { describeScheme, maxMarks, type MarkingScheme } from "@/lib/marking"
import { cn } from "@/lib/utils"

export type PreviewSummary = {
    title: string
    duration: number | null
    batches: string[]
    opens: string | null
    closes: string | null
    marking: MarkingScheme
}

/** Total marks a set of questions is worth under a scheme. */
export function totalMarks(questions: StoredQuestion[], scheme: MarkingScheme) {
    return questions.reduce((n, q) => n + maxMarks({ type: q.type ?? "SINGLE", options: q.options, correct: q.correct }, scheme), 0)
}

/** Questions grouped by subject, keeping the order in which subjects first appear. */
export function groupBySubject(questions: StoredQuestion[]) {
    const groups: { subject: string; items: { q: StoredQuestion; n: number }[] }[] = []
    questions.forEach((q, i) => {
        const subject = q.subject?.name ?? "No subject"
        let g = groups.find(x => x.subject === subject)
        if (!g) { g = { subject, items: [] }; groups.push(g) }
        g.items.push({ q, n: i + 1 })
    })
    return groups
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/**
 * The whole test as students and staff will see it: a summary, then every
 * question grouped by subject with its answer. `onRemove` and `footer` make it
 * usable as the last step before creating a test.
 */
export function TestPreviewDialog({ open, onClose, summary, questions, onRemove, footer, loading }: {
    open: boolean
    onClose: () => void
    summary: PreviewSummary
    questions: StoredQuestion[]
    onRemove?: (id: string) => void
    footer?: ReactNode
    loading?: boolean
}) {
    const groups = groupBySubject(questions)
    const marks = totalMarks(questions, summary.marking)

    const facts: { icon: typeof Clock; label: string; value: string }[] = [
        { icon: FileQuestion, label: "Questions", value: String(questions.length) },
        { icon: Trophy, label: "Total marks", value: String(marks) },
        { icon: Clock, label: "Duration", value: summary.duration ? `${summary.duration} min` : "—" },
        { icon: Users, label: "Batches", value: summary.batches.length ? summary.batches.join(", ") : "All students" },
        { icon: CalendarClock, label: "Window", value: summary.opens || summary.closes ? `${summary.opens ? when(summary.opens) : "Now"} → ${summary.closes ? when(summary.closes) : "no end"}` : "Open as soon as published" },
        { icon: Scale, label: "Marking", value: describeScheme(summary.marking) },
    ]

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
                <DialogHeader className="border-b bg-slate-50 px-5 py-4">
                    <DialogTitle className="text-xl">{summary.title || "Untitled test"}</DialogTitle>
                    <DialogDescription>Preview of the paper with answers. Students won&apos;t see the answers or solutions while taking it.</DialogDescription>
                    <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {facts.map(f => (
                            <div key={f.label} className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                                <div className="min-w-0">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</dt>
                                    <dd className="truncate text-sm font-medium text-slate-900" title={f.value}>{f.value}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    {loading ? (
                        <p className="py-10 text-center text-sm text-slate-500">Loading questions…</p>
                    ) : questions.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">No questions selected yet.</p>
                    ) : (
                        <div className="space-y-8">
                            {groups.map(g => (
                                <section key={g.subject} className="space-y-3">
                                    <h3 className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-y border-slate-200 bg-indigo-50/95 px-5 py-2 backdrop-blur">
                                        <span className="text-base font-bold text-indigo-900">{g.subject}</span>
                                        <span className="text-xs font-medium text-indigo-700">{g.items.length} question{g.items.length === 1 ? "" : "s"} · {totalMarks(g.items.map(i => i.q), summary.marking)} marks</span>
                                    </h3>
                                    <ol className="space-y-3">
                                        {g.items.map(({ q, n }) => {
                                            const diff = DIFFICULTY[q.difficulty ?? "INTERMEDIATE"] ?? DIFFICULTY.INTERMEDIATE
                                            return (
                                                <li key={q.id} className={cn("rounded-xl border border-l-4 border-slate-200 bg-white p-4", diff.edge)}>
                                                    <div className="mb-2 flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">Q{n}</span>
                                                            <span className="truncate text-xs text-slate-500">{topicPath(q)}</span>
                                                            <span className="text-xs text-slate-400">·</span>
                                                            <span className="text-xs text-slate-600">{TYPE_LABEL[q.type ?? "SINGLE"]}</span>
                                                            <span className="text-xs text-slate-400">·</span>
                                                            <span className="text-xs text-slate-600">{diff.label}</span>
                                                        </div>
                                                        {onRemove && (
                                                            <Button variant="ghost" size="sm" className="h-7 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onRemove(q.id)}>
                                                                <Trash2 className="h-3.5 w-3.5" />Remove
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <QuestionView draft={draftFromQuestion(q)} showMeta={false} />
                                                </li>
                                            )
                                        })}
                                    </ol>
                                </section>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t bg-white px-5 py-3 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    {footer}
                </div>
            </DialogContent>
        </Dialog>
    )
}
