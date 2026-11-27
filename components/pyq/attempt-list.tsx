"use client"

import Link from "next/link"
import { ArrowRight, BookOpenCheck, PlayCircle, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

export type AttemptRow = { id: string; kind: string; mode: string; title: string; startedAt: string; submittedAt: string | null; score: number | null; total: number | null; questions: number }

/** A learner's practice attempts: score when finished, "Resume" otherwise. */
export function AttemptList({ attempts }: { attempts: AttemptRow[] }) {
    return (
        <ul className="divide-y rounded-xl border bg-white shadow-sm">
            {attempts.map(a => {
                const pct = a.total ? Math.round(((a.score ?? 0) / a.total) * 100) : null
                return (
                    <li key={a.id}>
                        <Link href={`/practice/attempt/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", a.mode === "TEST" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600")}>
                                {a.mode === "TEST" ? <Timer className="h-4 w-4" /> : <BookOpenCheck className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-slate-900">{a.title}</p>
                                <p className="text-xs text-slate-500">{a.mode === "TEST" ? "Test" : "Practice"} · {a.questions} questions · {new Date(a.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
                            </div>
                            {a.submittedAt ? (
                                <span className="text-right">
                                    <span className="block font-bold tabular-nums text-slate-900">{a.score}/{a.total}</span>
                                    {pct !== null && <span className={cn("text-xs font-semibold", pct >= 60 ? "text-emerald-700" : pct >= 35 ? "text-amber-700" : "text-red-700")}>{pct}%</span>}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"><PlayCircle className="h-3.5 w-3.5" />Resume</span>
                            )}
                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

