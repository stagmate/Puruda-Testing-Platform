"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, MinusCircle, CircleDot, Lightbulb, Lock, Loader2, ZoomIn } from "lucide-react"
import { RichText } from "@/components/rich-text"
import { ImageViewer } from "@/components/image-viewer"
import type { ReviewItem, ReviewStatus } from "@/lib/answer-review"
import { cn } from "@/lib/utils"

type SubjectRow = { subject: string; score: number; total: number; correct: number; partial: number; wrong: number; unanswered: number }
export type ReviewData = {
    title: string
    released: boolean
    score?: number
    total?: number
    marking?: string
    answersRevealed?: boolean
    revealAt?: string | null
    subjects?: SubjectRow[]
    questions?: ReviewItem[]
}

const STATUS: Record<ReviewStatus, { label: string; icon: typeof CheckCircle2; chip: string; edge: string }> = {
    correct: { label: "Correct", icon: CheckCircle2, chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", edge: "border-l-emerald-500" },
    partial: { label: "Partly correct", icon: CircleDot, chip: "bg-amber-50 text-amber-800 ring-amber-200", edge: "border-l-amber-500" },
    wrong: { label: "Wrong", icon: XCircle, chip: "bg-red-50 text-red-700 ring-red-200", edge: "border-l-red-500" },
    unanswered: { label: "Not answered", icon: MinusCircle, chip: "bg-slate-100 text-slate-600 ring-slate-200", edge: "border-l-slate-300" },
}
const FILTERS: ("all" | ReviewStatus)[] = ["all", "correct", "partial", "wrong", "unanswered"]
const LETTER = "ABCDEF"

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/** Loads and shows a student's question-by-question review of a submitted test. */
export function ResultReview({ testId, showSummary = true }: { testId: string; showSummary?: boolean }) {
    const [data, setData] = useState<ReviewData | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
        let live = true
        fetch(`/api/student/results/${testId}/review`)
            .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() })
            .then(d => { if (live) setData(d) })
            .catch(e => { if (live) setError(e instanceof Error && e.message ? e.message : "Couldn't load the answers") })
        return () => { live = false }
    }, [testId])

    if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
    if (!data) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
    if (!data.released) return <p className="rounded-xl border border-dashed bg-white p-5 text-center text-sm text-slate-500">Your teacher will publish the results and answers later.</p>
    return <ReviewView data={data} showSummary={showSummary} />
}

export function ReviewView({ data, showSummary }: { data: ReviewData; showSummary: boolean }) {
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all")
    const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)
    const questions = data.questions ?? []
    const counts = Object.fromEntries(FILTERS.map(f => [f, f === "all" ? questions.length : questions.filter(q => q.status === f).length]))
    const shown = filter === "all" ? questions : questions.filter(q => q.status === filter)
    const percent = data.total ? Math.round(((data.score ?? 0) / data.total) * 1000) / 10 : 0

    return (
        <div className="space-y-5">
            {showSummary && (
                <section className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your score</p>
                            <p className="text-4xl font-bold tabular-nums text-slate-900">{data.score}<span className="text-2xl text-slate-400"> / {data.total}</span></p>
                            <p className="text-sm text-slate-500">{percent}%{data.marking ? ` · ${data.marking}` : ""}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            {(["correct", "partial", "wrong", "unanswered"] as ReviewStatus[]).map(s => {
                                const S = STATUS[s]
                                return (
                                    <div key={s} className={cn("rounded-xl px-3 py-2 ring-1 ring-inset", S.chip)}>
                                        <p className="text-xl font-bold tabular-nums">{counts[s]}</p>
                                        <p className="text-[11px] font-medium">{S.label}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    {data.subjects && data.subjects.length > 1 && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-3">Subject</th><th className="px-3">Marks</th><th className="px-3">Correct</th><th className="px-3">Wrong</th><th className="px-3">Not answered</th></tr></thead>
                                <tbody className="divide-y">
                                    {data.subjects.map(s => (
                                        <tr key={s.subject}><td className="py-2 pr-3 font-medium">{s.subject}</td><td className="px-3 tabular-nums">{s.score} / {s.total}</td><td className="px-3 tabular-nums">{s.correct}</td><td className="px-3 tabular-nums">{s.wrong + s.partial}</td><td className="px-3 tabular-nums">{s.unanswered}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">Question-wise result</h2>
                    <div className="flex flex-wrap gap-1.5">
                        {FILTERS.filter(f => f === "all" || counts[f] > 0).map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFilter(f)}
                                aria-pressed={filter === f}
                                className={cn("rounded-full px-3 py-1 text-sm font-medium transition", filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}
                            >
                                {f === "all" ? "All" : STATUS[f].label} <span className="tabular-nums opacity-70">{counts[f]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {!data.answersRevealed && (
                    <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        Correct answers and solutions will appear here {data.revealAt ? `after the test closes on ${when(data.revealAt)}` : "after the test closes"}, once every student has finished.
                    </p>
                )}

                <ol className="space-y-3">
                    {shown.map(q => <ReviewCard key={q.id} q={q} onZoom={(src, alt) => setZoom({ src, alt })} />)}
                </ol>
            </section>

            {zoom && <ImageViewer src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
        </div>
    )
}

function ReviewCard({ q, onZoom }: { q: ReviewItem; onZoom: (src: string, alt: string) => void }) {
    const S = STATUS[q.status]
    const revealed = q.correct !== undefined
    return (
        <li className={cn("overflow-hidden rounded-xl border border-l-4 bg-white shadow-sm", S.edge)}>
            <header className="flex flex-wrap items-center gap-2 border-b bg-slate-50/70 px-4 py-2.5">
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">Q{q.number}</span>
                {q.subject && <span className="text-sm font-medium text-slate-700">{q.subject}{q.chapter ? <span className="text-slate-400"> › {q.chapter}</span> : null}</span>}
                <span className="ml-auto flex items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", S.chip)}><S.icon className="h-3.5 w-3.5" />{S.label}</span>
                    <span className={cn("text-sm font-bold tabular-nums", q.marks > 0 ? "text-emerald-700" : q.marks < 0 ? "text-red-700" : "text-slate-500")}>
                        {signed(q.marks)} <span className="font-normal text-slate-400">/ {q.maxMarks}</span>
                    </span>
                </span>
            </header>

            <div className="space-y-4 p-4">
                <div className="text-[15px] leading-relaxed text-slate-900"><RichText text={q.text} /></div>
                {q.imageUrl && <Zoomable src={q.imageUrl} alt={`Question ${q.number} diagram`} onZoom={onZoom} className="max-h-72" />}

                {q.type === "INTEGER" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                        <AnswerBox label="Your answer" value={q.typed ?? "Not answered"} tone={q.status === "correct" ? "good" : q.typed ? "bad" : "none"} />
                        {revealed && <AnswerBox label="Correct answer" value={q.correctText ?? "—"} tone="good" />}
                    </div>
                ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((o, i) => {
                            const isCorrect = revealed && q.correct!.includes(i)
                            const isChosen = !!q.chosen?.includes(i)
                            return (
                                <li key={i} className={cn(
                                    "flex items-start gap-2.5 rounded-lg border-2 px-3 py-2",
                                    isCorrect ? "border-emerald-500 bg-emerald-50" : isChosen ? (revealed ? "border-red-400 bg-red-50" : "border-indigo-500 bg-indigo-50") : "border-slate-200",
                                )}>
                                    <span className={cn(
                                        "mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                        isCorrect ? "bg-emerald-600 text-white" : isChosen ? (revealed ? "bg-red-500 text-white" : "bg-indigo-600 text-white") : "bg-slate-100 text-slate-600",
                                    )}>{LETTER[i]}</span>
                                    <div className="min-w-0 flex-1 text-sm text-slate-900">
                                        {o.text && <RichText text={o.text} />}
                                        {o.image && <Zoomable src={o.image} alt={`Option ${LETTER[i]}`} onZoom={onZoom} className="mt-1 max-h-28" />}
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {isChosen && <span className="rounded bg-white/80 px-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">Your answer</span>}
                                            {isCorrect && <span className="rounded bg-white/80 px-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Correct answer</span>}
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}

                {revealed && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-indigo-900"><Lightbulb className="h-4 w-4" />Solution &amp; explanation</p>
                        {q.solution
                            ? <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800"><RichText text={q.solution} /></div>
                            : <p className="text-sm text-slate-600">Correct answer: <b>{q.correctText}</b>. No written solution was added for this question.</p>}
                    </div>
                )}
            </div>
        </li>
    )
}

function AnswerBox({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "none" }) {
    return (
        <div className={cn("rounded-lg border-2 px-3 py-2", tone === "good" ? "border-emerald-500 bg-emerald-50" : tone === "bad" ? "border-red-400 bg-red-50" : "border-slate-200")}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
        </div>
    )
}

function Zoomable({ src, alt, onZoom, className }: { src: string; alt: string; onZoom: (src: string, alt: string) => void; className?: string }) {
    return (
        <button type="button" onClick={() => onZoom(src, alt)} className="group relative inline-block max-w-full cursor-zoom-in rounded border bg-white" aria-label={`Enlarge ${alt}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className={cn("h-auto w-auto max-w-full rounded object-contain", className)} />
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white"><ZoomIn className="h-3 w-3" />Enlarge</span>
        </button>
    )
}
