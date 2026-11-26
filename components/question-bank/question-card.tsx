"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, ImageIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { RichText } from "@/components/rich-text"
import { QuestionView } from "./question-view"
import type { StoredQuestion } from "./question-form-dialog"
import { draftFromQuestion } from "@/lib/question-input"
import { cn } from "@/lib/utils"

export const TYPE_LABEL: Record<string, string> = { SINGLE: "Single correct", MULTIPLE: "Multiple correct", INTEGER: "Integer" }
export const DIFFICULTY: Record<string, { label: string; chip: string; edge: string }> = {
    BEGINNER: { label: "Beginner", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", edge: "border-l-emerald-400" },
    INTERMEDIATE: { label: "Intermediate", chip: "bg-amber-50 text-amber-800 ring-amber-200", edge: "border-l-amber-400" },
    ADVANCED: { label: "Advanced", chip: "bg-red-50 text-red-700 ring-red-200", edge: "border-l-red-400" },
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", className)}>{children}</span>
}

/** Where the question is filed, as "Physics › Kinematics › Projectiles". */
export function topicPath(q: StoredQuestion) {
    return [q.subject?.name, q.chapter?.name, q.subtopic?.name].filter(Boolean).join(" › ") || "No subject"
}

/**
 * One question: number, topic path and tags in the header, then the question.
 * `compact` shows a two-line preview that expands on demand (for pick lists).
 */
export function QuestionCard({ question: q, number, actions, selected, onSelect, compact, className }: {
    question: StoredQuestion
    number?: number | string
    actions?: ReactNode
    selected?: boolean
    onSelect?: (on: boolean) => void
    compact?: boolean
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const diff = DIFFICULTY[q.difficulty ?? "INTERMEDIATE"] ?? DIFFICULTY.INTERMEDIATE
    const draft = draftFromQuestion(q)
    const hasImage = !!q.imageUrl || draft.optionImages.some(Boolean)

    return (
        <article className={cn(
            "overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm transition",
            diff.edge,
            selected && "border-indigo-300 ring-2 ring-indigo-200",
            className,
        )}>
            <header className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                {onSelect && (
                    <Checkbox checked={!!selected} onCheckedChange={v => onSelect(v === true)} className="mt-1" aria-label={`Select question ${number ?? ""}`} />
                )}
                {number !== undefined && (
                    <span className="mt-0.5 shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold tabular-nums text-white">Q{number}</span>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold text-slate-800" title={topicPath(q)}>{topicPath(q)}</p>
                    <div className="flex flex-wrap gap-1">
                        <Chip className="bg-white text-slate-700 ring-slate-200">{TYPE_LABEL[q.type ?? "SINGLE"] ?? q.type}</Chip>
                        <Chip className={diff.chip}>{diff.label}</Chip>
                        {(q.course || q.batch) && <Chip className="bg-indigo-50 text-indigo-700 ring-indigo-200">{[q.course?.name, q.batch?.name].filter(Boolean).join(" › ")}</Chip>}
                        {q.examTag && <Chip className="bg-purple-50 text-purple-700 ring-purple-200">{q.examTag}</Chip>}
                        {!!q._count?.tests && <Chip className="bg-sky-50 text-sky-700 ring-sky-200">In {q._count.tests} test{q._count.tests === 1 ? "" : "s"}</Chip>}
                        {compact && hasImage && <Chip className="bg-white text-slate-600 ring-slate-200"><ImageIcon className="mr-1 h-3 w-3" />Image</Chip>}
                    </div>
                </div>
                {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
            </header>

            <div className="px-4 py-3">
                {compact && !open ? (
                    <button type="button" onClick={() => setOpen(true)} className="group block w-full text-left">
                        <p className="line-clamp-2 text-[15px] leading-relaxed text-slate-900"><RichText text={q.text || "(Image question)"} /></p>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:underline">Show options &amp; answer<ChevronDown className="h-3 w-3" /></span>
                    </button>
                ) : (
                    <>
                        <QuestionView draft={draft} showMeta={false} />
                        {compact && (
                            <button type="button" onClick={() => setOpen(false)} className="mt-2 text-xs font-medium text-indigo-600 hover:underline">Show less</button>
                        )}
                    </>
                )}
            </div>
        </article>
    )
}
