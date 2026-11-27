"use client"

import Link from "next/link"
import { ArrowLeft, Clock, Gauge, RotateCcw, Target, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewView, type ReviewData } from "@/components/result-review"
import { formatDuration } from "@/lib/pyq"

export type FinishedAttempt = ReviewData & {
    id: string; kind: string; mode: string; accuracy: number; attempted: number; totalSeconds: number; submittedAt: string
}

/** Score, accuracy and time, then every question with your answer and the solution. */
export function PracticeResult({ attempt, onRetry, retrying }: { attempt: FinishedAttempt; onRetry?: () => void; retrying?: boolean }) {
    const count = attempt.questions?.length ?? 0
    const percent = attempt.total ? Math.round(((attempt.score ?? 0) / attempt.total) * 100) : 0
    const tiles = [
        { icon: Trophy, label: "Score", value: `${attempt.score} / ${attempt.total}`, sub: `${percent}%` },
        { icon: Target, label: "Accuracy", value: `${attempt.accuracy}%`, sub: "of the questions you answered" },
        { icon: Gauge, label: "Attempted", value: `${attempt.attempted} / ${count}`, sub: `${count - attempt.attempted} left blank` },
        { icon: Clock, label: "Time taken", value: formatDuration(attempt.totalSeconds), sub: attempt.attempted ? `${formatDuration(attempt.totalSeconds / Math.max(1, count))} a question` : "" },
    ]
    return (
        <div className="mx-auto w-full max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"><ArrowLeft className="h-4 w-4" />Back to PYQ practice</Link>
                {onRetry && <Button variant="outline" onClick={onRetry} disabled={retrying}><RotateCcw className="h-4 w-4" />Attempt again</Button>}
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{attempt.mode === "TEST" ? "Test" : "Practice"} result</p>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{attempt.title}</h1>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {tiles.map(t => (
                        <div key={t.label} className="rounded-xl bg-slate-50 p-3">
                            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><t.icon className="h-4 w-4" />{t.label}</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{t.value}</p>
                            {t.sub && <p className="text-xs text-slate-500">{t.sub}</p>}
                        </div>
                    ))}
                </div>
            </div>
            <ReviewView data={attempt} showSummary />
        </div>
    )
}
