"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Award, ChevronDown, FileBarChart, Hourglass, Printer, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentReviewsList } from "@/components/student-reviews-list"
import { cn } from "@/lib/utils"

type SubjectRow = { subject: string; score: number; total: number; correct: number; partial: number; wrong: number; unanswered: number }
type Result = {
    id: string
    testId: string
    title: string
    completedAt: string
    questionCount: number
    released: boolean
    score?: number
    total?: number
    percentage?: number
    marking?: string
    rank?: { rank: number; of: number } | null
    subjects?: SubjectRow[]
}

const pct = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 1000) / 10 : 0)

export default function StudentResultsPage() {
    const [results, setResults] = useState<Result[] | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
        fetch("/api/student/results")
            .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() })
            .then(setResults)
            .catch(e => { setError(e instanceof Error ? e.message : "Couldn't load your results"); setResults([]) })
    }, [])

    const released = (results ?? []).filter(r => r.released && typeof r.score === "number")
    const average = released.length ? Math.round(released.reduce((n, r) => n + (r.percentage ?? 0), 0) / released.length * 10) / 10 : null
    const best = released.length ? Math.max(...released.map(r => r.percentage ?? 0)) : null

    return (
        <div className="space-y-6 p-4 sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Results &amp; Reports</h1>
                    <p className="mt-1 text-sm text-slate-500">Every test you have submitted, with marks by subject.</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/student/report"><Printer className="mr-1.5 h-4 w-4" />Progress report (print / PDF)</Link>
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
                <Stat icon={FileBarChart} label="Tests taken" value={results ? String(results.length) : "—"} />
                <Stat icon={Award} label="Average score" value={average === null ? "—" : `${average}%`} />
                <Stat icon={Trophy} label="Best score" value={best === null ? "—" : `${best}%`} />
            </div>

            {/* Results */}
            <section aria-labelledby="results" className="space-y-3">
                <h2 id="results" className="text-lg font-semibold text-slate-900">Results</h2>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {results === null ? (
                    <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                ) : results.length === 0 ? (
                    <p className="rounded-xl border border-dashed bg-white p-5 text-sm text-slate-500">
                        You haven&apos;t submitted any tests yet. <Link href="/student" className="font-medium text-indigo-600 hover:underline">See available tests</Link>
                    </p>
                ) : (
                    <ul className="space-y-3">{results.map(r => <ResultCard key={r.id} result={r} />)}</ul>
                )}
            </section>

            <StudentReviewsList />
        </div>
    )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) {
    return (
        <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Icon className="h-4 w-4" />{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
        </div>
    )
}

function ResultCard({ result: r }: { result: Result }) {
    const [open, setOpen] = useState(false)
    const date = new Date(r.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

    if (!r.released || typeof r.score !== "number") {
        return (
            <li className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-slate-900">{r.title}</h3>
                        <p className="text-xs text-slate-500">Submitted {date}</p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"><Hourglass className="h-3.5 w-3.5" />Result not released yet</span>
                </div>
            </li>
        )
    }

    const p = r.percentage ?? 0
    return (
        <li className="rounded-xl border bg-white shadow-sm">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{r.title}</h3>
                    <p className="text-xs text-slate-500">Submitted {date}{r.marking ? ` · ${r.marking}` : ""}</p>
                </div>
                {r.rank && <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">Rank {r.rank.rank} of {r.rank.of}</span>}
                <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-slate-900">{r.score} / {r.total}</p>
                    <p className={cn("text-xs font-semibold tabular-nums", p >= 60 ? "text-green-700" : p >= 35 ? "text-amber-700" : "text-red-700")}>{p}%</p>
                </div>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && r.subjects && (
                <div className="overflow-x-auto border-t px-4 pb-4 pt-3">
                    <table className="w-full min-w-[30rem] text-sm">
                        <thead className="text-left text-xs text-slate-500">
                            <tr>
                                <th className="py-1.5 pr-3 font-medium">Subject</th>
                                <th className="py-1.5 pr-3 font-medium">Marks</th>
                                <th className="py-1.5 pr-3 font-medium text-green-700">Correct</th>
                                <th className="py-1.5 pr-3 font-medium text-amber-700">Partial</th>
                                <th className="py-1.5 pr-3 font-medium text-red-700">Wrong</th>
                                <th className="py-1.5 font-medium">Not answered</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {r.subjects.map(s => (
                                <tr key={s.subject} className="border-t">
                                    <td className="py-2 pr-3 font-medium text-slate-900">{s.subject}</td>
                                    <td className="py-2 pr-3">{s.score} / {s.total} <span className="text-xs text-slate-500">({pct(s.score, s.total)}%)</span></td>
                                    <td className="py-2 pr-3">{s.correct}</td>
                                    <td className="py-2 pr-3">{s.partial}</td>
                                    <td className="py-2 pr-3">{s.wrong}</td>
                                    <td className="py-2">{s.unanswered}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </li>
    )
}
