"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { CalendarClock, CheckCircle2, Clock, FileText, Megaphone, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TestInterface } from "@/components/test-interface"
import { cn } from "@/lib/utils"

type StudentTestSummary = {
    id: string
    title: string
    type: string
    duration: number
    startTime: string | null
    endTime: string | null
    submitted: boolean
    _count: { questions: number }
}

type Announcement = { id: string; title: string; content: string; createdAt: string; author?: { name: string | null } | null }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

export default function StudentDashboard() {
    const { data: session } = useSession()
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
    const [tests, setTests] = useState<StudentTestSummary[] | null>(null)
    const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)

    const loadTests = useCallback(() => {
        fetch("/api/student/tests")
            .then(r => (r.ok ? r.json() : []))
            .then(setTests)
            .catch(() => setTests([]))
    }, [])

    useEffect(() => {
        loadTests()
        fetch("/api/announcements")
            .then(r => (r.ok ? r.json() : []))
            .then(data => setAnnouncements(Array.isArray(data) ? data : []))
            .catch(() => setAnnouncements([]))
    }, [loadTests])

    if (selectedTestId) {
        return <TestInterface testId={selectedTestId} onComplete={() => { setSelectedTestId(null); loadTests() }} />
    }

    const firstName = session?.user?.name?.split(" ")[0]

    return (
        <div className="space-y-5 p-4 sm:px-6 sm:py-6">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{firstName ? `Welcome, ${firstName}` : "Dashboard"}</h1>

            {/* Side by side on large screens, stacked (announcements first) on small ones */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
            {/* Announcements */}
            <section aria-labelledby="announcements" className="min-w-0 space-y-3">
                <h2 id="announcements" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Megaphone className="h-5 w-5 text-orange-500" />Announcements
                </h2>
                {announcements === null ? (
                    <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ) : announcements.length === 0 ? (
                    <p className="rounded-xl border border-dashed bg-white p-5 text-sm text-slate-500">No announcements right now.</p>
                ) : (
                    <ul className="space-y-3">
                        {announcements.map(a => (
                            <li key={a.id} className="rounded-xl border border-l-4 border-l-orange-500 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                                    <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}{a.author?.name ? ` · ${a.author.name}` : ""}</span>
                                </div>
                                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{a.content}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Available tests */}
            <section aria-labelledby="tests" className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="tests" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <FileText className="h-5 w-5 text-indigo-600" />Available tests
                    </h2>
                    <Link href="/student/results" className="text-sm font-medium text-indigo-600 hover:underline">See my results →</Link>
                </div>
                {tests === null ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2"><div className="h-28 animate-pulse rounded-xl bg-slate-100" /><div className="h-28 animate-pulse rounded-xl bg-slate-100" /></div>
                ) : tests.length === 0 ? (
                    <p className="rounded-xl border border-dashed bg-white p-5 text-sm text-slate-500">No tests have been released to you yet.</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                        {tests.map(t => <TestCard key={t.id} test={t} onStart={() => setSelectedTestId(t.id)} />)}
                    </div>
                )}
            </section>
            </div>
        </div>
    )
}

function TestCard({ test, onStart }: { test: StudentTestSummary; onStart: () => void }) {
    // Decided once per render from the clock; the list reloads after each test.
    const [now] = useState(() => Date.now())
    const notYet = !!test.startTime && new Date(test.startTime).getTime() > now
    const closed = !!test.endTime && new Date(test.endTime).getTime() < now
    const state = test.submitted ? "submitted" : notYet ? "scheduled" : closed ? "closed" : "open"

    return (
        <div className="flex flex-col justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm">
            <div>
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{test.title}</h3>
                    <span className={cn("shrink-0 rounded px-2 py-0.5 text-xs font-semibold", {
                        open: "bg-green-100 text-green-800",
                        scheduled: "bg-blue-100 text-blue-800",
                        closed: "bg-slate-200 text-slate-700",
                        submitted: "bg-emerald-100 text-emerald-800",
                    }[state])}>
                        {{ open: "Open", scheduled: "Upcoming", closed: "Closed", submitted: "Submitted" }[state]}
                    </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                    <span>{test._count.questions} questions</span>
                    {test.duration > 0 && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{test.duration} min</span>}
                </p>
                {notYet && test.startTime && <p className="mt-1 flex items-center gap-1 text-xs text-blue-700"><CalendarClock className="h-3.5 w-3.5" />Opens {when(test.startTime)}</p>}
                {!notYet && test.endTime && !test.submitted && <p className="mt-1 text-xs text-slate-500">{closed ? "Closed" : "Closes"} {when(test.endTime)}</p>}
            </div>
            {state === "submitted" ? (
                <Link href="/student/results" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline">
                    <CheckCircle2 className="h-4 w-4" />View result
                </Link>
            ) : (
                <Button onClick={onStart} disabled={state !== "open"} className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:self-start">
                    <PlayCircle className="mr-1.5 h-4 w-4" />Start test
                </Button>
            )}
        </div>
    )
}
