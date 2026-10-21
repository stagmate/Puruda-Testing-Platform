"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NewsWidget } from "@/components/news-widget"
import { ActivityChart } from "@/components/admin/activity-chart"
import { adminSectionHref } from "@/lib/admin-sections"
import {
    Users, BookOpen, PenTool, Target, ClipboardCheck, FileEdit, Radio, ChevronRight,
    UserPlus, FilePlus2, CalendarPlus, RefreshCw, type LucideIcon,
} from "lucide-react"

type Stats = {
    users: { total: number; students: number; teachers: number; admins: number; newThisWeek: number }
    catalog: { courses: number; batches: number; subjects: number; questions: number }
    tests: { total: number; drafts: number; live: number; upcoming: number }
    results: { submissions: number; averageAccuracy: number | null }
    pendingReviews: number
    activity: { date: string; count: number }[]
    recentResults: {
        id: string; score: number; total: number; completedAt: string
        user: { name: string | null; email: string }
        test: { title: string }
    }[]
    generatedAt: string
    upcomingTests: {
        id: string; title: string; startTime: string | null; endTime: string | null; duration: number
        _count: { questions: number; results: number }
    }[]
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

function timeAgo(iso: string, now: number) {
    const s = Math.round((now - new Date(iso).getTime()) / 1000)
    if (s < 60) return "just now"
    const m = Math.round(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.round(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.round(h / 24)
    return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString()
}

function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export function AdminOverview() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [error, setError] = useState(false)

    // State is only set inside the promise callbacks, never synchronously in the effect.
    const fetchStats = useCallback(() => {
        return fetch(`/api/admin/stats?tzOffset=${new Date().getTimezoneOffset()}`)
            .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((data: Stats) => { setStats(data); setError(false) })
            .catch(() => setError(true))
    }, [])

    useEffect(() => { fetchStats() }, [fetchStats])

    const retry = () => {
        setError(false)
        fetchStats()
    }

    if (error && !stats) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-slate-600">Couldn&apos;t load the dashboard numbers.</p>
                    <Button variant="outline" size="sm" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
                </CardContent>
            </Card>
        )
    }

    const s = stats
    const attention = s ? [
        s.pendingReviews > 0 && {
            icon: ClipboardCheck, tone: "text-amber-700 bg-amber-50 border-amber-200",
            label: `${s.pendingReviews} teacher review${s.pendingReviews === 1 ? "" : "s"} waiting for approval`,
            href: adminSectionHref("reviews"), action: "Review",
        },
        s.tests.live > 0 && {
            icon: Radio, tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
            label: `${s.tests.live} test${s.tests.live === 1 ? " is" : "s are"} live right now`,
            href: adminSectionHref("results"), action: "Results",
        },
        s.tests.drafts > 0 && {
            icon: FileEdit, tone: "text-slate-700 bg-slate-50 border-slate-200",
            label: `${s.tests.drafts} draft test${s.tests.drafts === 1 ? "" : "s"} not yet published`,
            href: adminSectionHref("tests"), action: "Open",
        },
    ].filter(Boolean) as { icon: LucideIcon; tone: string; label: string; href: string; action: string }[] : []

    return (
        <div className="space-y-4 md:space-y-6">
            {/* KPI tiles: 2 per row on phones, 4 on large screens */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <StatTile
                    label="Students" icon={Users} accent="text-violet-600 bg-violet-50"
                    value={s && compact.format(s.users.students)}
                    sub={s && `${s.users.teachers} teacher${s.users.teachers === 1 ? "" : "s"} · +${s.users.newThisWeek} this week`}
                />
                <StatTile
                    label="Questions" icon={BookOpen} accent="text-orange-600 bg-orange-50"
                    value={s && compact.format(s.catalog.questions)}
                    sub={s && `${s.catalog.subjects} subject${s.catalog.subjects === 1 ? "" : "s"} · ${s.catalog.courses} course${s.catalog.courses === 1 ? "" : "s"}`}
                />
                <StatTile
                    label="Tests" icon={PenTool} accent="text-emerald-600 bg-emerald-50"
                    value={s && compact.format(s.tests.total)}
                    sub={s && `${s.tests.live} live · ${s.tests.upcoming} upcoming`}
                />
                <StatTile
                    label="Average score" icon={Target} accent="text-sky-600 bg-sky-50"
                    value={s && (s.results.averageAccuracy === null ? "–" : `${s.results.averageAccuracy}%`)}
                    sub={s && `from ${compact.format(s.results.submissions)} submissions`}
                />
            </div>

            {/* Things that need the admin's attention */}
            {attention.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {attention.map(a => (
                        <Link
                            key={a.label}
                            href={a.href}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition hover:shadow-sm ${a.tone}`}
                        >
                            <a.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{a.label}</span>
                            <span className="flex items-center text-xs font-semibold">{a.action}<ChevronRight className="h-3.5 w-3.5" /></span>
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Test submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {s ? <ActivityChart days={s.activity} /> : <div className="h-52 animate-pulse rounded bg-slate-100" />}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Quick actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                        <QuickAction href={adminSectionHref("users")} icon={UserPlus} label="Add a user" />
                        <QuickAction href={adminSectionHref("questions")} icon={FilePlus2} label="Add questions" />
                        <QuickAction href={adminSectionHref("tests")} icon={CalendarPlus} label="Create a test" />
                        <QuickAction href={adminSectionHref("courses")} icon={Users} label="Enrol students" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Recent submissions</CardTitle>
                        <Link href={adminSectionHref("results")} className="text-xs font-medium text-indigo-600 hover:underline">View all</Link>
                    </CardHeader>
                    <CardContent>
                        {!s ? <ListSkeleton /> : s.recentResults.length === 0 ? (
                            <EmptyRow text="No submissions yet." />
                        ) : (
                            <ul className="divide-y">
                                {s.recentResults.map(r => {
                                    const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0
                                    return (
                                        <li key={r.id} className="flex items-center gap-3 py-2.5">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-900">{r.user.name || r.user.email}</p>
                                                <p className="truncate text-xs text-slate-500">{r.test.title} · {timeAgo(r.completedAt, new Date(s.generatedAt).getTime())}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">{r.score}/{r.total}</p>
                                                <p className="text-xs text-slate-500 tabular-nums">{pct}%</p>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Live & upcoming tests</CardTitle>
                        <Link href={adminSectionHref("tests")} className="text-xs font-medium text-indigo-600 hover:underline">Manage</Link>
                    </CardHeader>
                    <CardContent>
                        {!s ? <ListSkeleton /> : s.upcomingTests.length === 0 ? (
                            <EmptyRow text="Nothing scheduled. Tests with a start or end time show up here." />
                        ) : (
                            <ul className="divide-y">
                                {s.upcomingTests.map(t => {
                                    const now = new Date(s.generatedAt).getTime()
                                    const started = !t.startTime || new Date(t.startTime).getTime() <= now
                                    return (
                                        <li key={t.id} className="flex items-center gap-3 py-2.5">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {started
                                                        ? t.endTime ? `Ends ${fmtDateTime(t.endTime)}` : "Open"
                                                        : `Starts ${fmtDateTime(t.startTime!)}`}
                                                    {" · "}{t._count.questions} Qs · {t.duration} min
                                                </p>
                                            </div>
                                            {started ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                    <Radio className="h-3 w-3" />Live · {t._count.results}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Scheduled</span>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <NewsWidget />
        </div>
    )
}

function StatTile({ label, value, sub, icon: Icon, accent }: {
    label: string; value: string | null | undefined | false; sub: string | null | undefined | false
    icon: LucideIcon; accent: string
}) {
    return (
        <Card className="gap-0 py-0">
            <CardContent className="p-3 md:p-5">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-600 md:text-sm">{label}</p>
                    <span className={`rounded-md p-1.5 ${accent}`}><Icon className="h-4 w-4" /></span>
                </div>
                {value ? (
                    <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums md:text-3xl">{value}</p>
                ) : (
                    <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-100" />
                )}
                <p className="mt-1 min-h-4 truncate text-[11px] text-slate-500 md:text-xs">{sub || ""}</p>
            </CardContent>
        </Card>
    )
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
            <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
            <span className="truncate">{label}</span>
        </Link>
    )
}

function ListSkeleton() {
    return (
        <div className="space-y-3 py-1">
            {[0, 1, 2].map(i => <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />)}
        </div>
    )
}

function EmptyRow({ text }: { text: string }) {
    return <p className="py-6 text-center text-sm text-slate-500">{text}</p>
}
