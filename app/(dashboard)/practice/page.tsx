"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { BookOpenCheck, Timer, FileText, Layers, Loader2, Target, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CHAPTER_SET_SIZES, chapterTestMinutes, type PracticeMode } from "@/lib/pyq"
import { cn } from "@/lib/utils"
import { AttemptList, type AttemptRow } from "@/components/pyq/attempt-list"

type Paper = { id: string; exam: string; year: number; session: string; title: string; duration: number; questions: number; bestPercent: number | null }
type Chapter = { id: string | null; name: string; questions: number; attempted: number }
type Subject = { id: string; name: string; questions: number; chapters: Chapter[] }
type Catalog = { stats: { papers: number; questions: number; attempted: number; tests: number }; papers: Paper[]; subjects: Subject[]; recent: AttemptRow[] }

export default function PracticeHome() {
    const router = useRouter()
    const { data: session } = useSession()
    const [catalog, setCatalog] = useState<Catalog | null>(null)
    const [error, setError] = useState("")
    const [tab, setTab] = useState<"papers" | "chapters">("papers")
    const [starting, setStarting] = useState<string | null>(null)

    useEffect(() => {
        fetch("/api/practice/catalog")
            .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() })
            .then(setCatalog)
            .catch(e => setError(e instanceof Error && e.message ? e.message : "Couldn't load the practice library"))
    }, [])

    const start = async (key: string, body: Record<string, unknown>) => {
        setStarting(key)
        setError("")
        const res = await fetch("/api/practice/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null)
        if (!res?.ok) { setStarting(null); return setError((await res?.text()) || "Couldn't start. Please try again.") }
        const { id } = await res.json()
        router.push(`/practice/attempt/${id}`)
    }

    const firstName = session?.user?.name?.split(" ")[0]

    return (
        <div className="w-full space-y-6 p-4 pb-24 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{firstName ? `Hi ${firstName}, ready to practise?` : "PYQ practice"}</h1>
                    <p className="mt-1 text-sm text-slate-500">JEE previous-year questions as full papers or chapter-wise sets.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile icon={FileText} label="Full papers" value={catalog?.stats.papers} />
                <Tile icon={Target} label="PYQs available" value={catalog?.stats.questions} />
                <Tile icon={CheckCircle2} label="PYQs you've solved" value={catalog?.stats.attempted} />
                <Tile icon={Timer} label="Sets completed" value={catalog?.stats.tests} />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

            <div className="inline-grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
                {([["papers", FileText, "Full papers"], ["chapters", Layers, "Chapter-wise"]] as const).map(([k, Icon, label]) => (
                    <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k}
                        className={cn("flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", tab === k ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                        <Icon className="h-4 w-4" />{label}
                    </button>
                ))}
            </div>

            {!catalog ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : tab === "papers" ? (
                <Papers papers={catalog.papers} starting={starting} onStart={(p, mode) => start(`${p.id}:${mode}`, { kind: "PAPER", paperId: p.id, mode })} />
            ) : (
                <Chapters subjects={catalog.subjects} starting={starting} onStart={(ids, count, mode) => start(`chapters:${mode}`, { kind: "CHAPTER", chapterIds: ids, count, mode })} />
            )}

            {catalog && catalog.recent.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Recent attempts</h2>
                        <Link href="/practice/attempts" className="text-sm font-medium text-indigo-600 hover:underline">See all</Link>
                    </div>
                    <AttemptList attempts={catalog.recent} />
                </section>
            )}
        </div>
    )
}

function Tile({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: number | undefined }) {
    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Icon className="h-4 w-4" />{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value ?? "—"}</p>
        </div>
    )
}

function ModeButtons({ busyKey, starting, onPick, disabled }: { busyKey: string; starting: string | null; onPick: (m: PracticeMode) => void; disabled?: boolean }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onPick("PRACTICE")} disabled={!!starting || disabled} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                {starting === `${busyKey}:PRACTICE` ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}Practice
            </Button>
            <Button onClick={() => onPick("TEST")} disabled={!!starting || disabled} className="bg-indigo-600 hover:bg-indigo-700">
                {starting === `${busyKey}:TEST` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}Take test
            </Button>
        </div>
    )
}

function Papers({ papers, starting, onStart }: { papers: Paper[]; starting: string | null; onStart: (p: Paper, m: PracticeMode) => void }) {
    const years = useMemo(() => {
        const m = new Map<number, Paper[]>()
        for (const p of papers) m.set(p.year, [...(m.get(p.year) ?? []), p])
        return [...m.entries()]
    }, [papers])
    if (papers.length === 0) return <Empty text="No papers have been published yet. Check back soon." />
    return (
        <div className="space-y-6">
            {years.map(([year, list]) => (
                <section key={year} className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{year}</h2>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {list.map(p => (
                            <div key={p.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900">{p.exam}</p>
                                        <p className="text-sm text-slate-600">{p.session || p.title}</p>
                                    </div>
                                    {p.bestPercent !== null && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Best {p.bestPercent}%</span>}
                                </div>
                                <p className="text-xs text-slate-500">{p.questions} questions · {p.duration} min in test mode</p>
                                <ModeButtons busyKey={p.id} starting={starting} onPick={m => onStart(p, m)} />
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}

function Chapters({ subjects, starting, onStart }: { subjects: Subject[]; starting: string | null; onStart: (ids: string[], count: number, mode: PracticeMode) => void }) {
    const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "")
    const [chosen, setChosen] = useState<Set<string>>(new Set())
    const [count, setCount] = useState<number>(15)
    if (subjects.length === 0) return <Empty text="No chapter-wise questions yet. Check back soon." />
    const subject = subjects.find(s => s.id === subjectId) ?? subjects[0]
    const chapters = subject.chapters.filter((c): c is Chapter & { id: string } => !!c.id)
    const available = subjects.flatMap(s => s.chapters).filter(c => c.id && chosen.has(c.id)).reduce((n, c) => n + c.questions, 0)
    const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                    <button key={s.id} type="button" onClick={() => setSubjectId(s.id)} aria-pressed={s.id === subject.id}
                        className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold transition", s.id === subject.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300")}>
                        {s.name} <span className="opacity-70">{s.questions}</span>
                    </button>
                ))}
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {chapters.map(c => {
                    const pct = c.questions ? Math.round((c.attempted / c.questions) * 100) : 0
                    const on = chosen.has(c.id)
                    return (
                        <label key={c.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 shadow-sm transition", on ? "border-indigo-400 ring-2 ring-indigo-100" : "hover:border-slate-300")}>
                            <Checkbox checked={on} onCheckedChange={() => toggle(c.id)} className="mt-0.5" aria-label={c.name} />
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900">{c.name}</p>
                                <p className="text-xs text-slate-500">{c.questions} PYQs · {c.attempted} solved</p>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                            </div>
                        </label>
                    )
                })}
            </div>

            {/* Set builder, pinned to the bottom of the screen */}
            <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t bg-white/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(15,23,42,0.15)] backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pr-24">
                <div className="text-sm text-slate-700">
                    <b>{chosen.size}</b> chapter{chosen.size === 1 ? "" : "s"} chosen{chosen.size > 0 && <> · {available} PYQs</>}
                    {chosen.size > 0 && <button type="button" onClick={() => setChosen(new Set())} className="ml-2 text-xs text-slate-500 underline">Clear</button>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-slate-600">
                        Questions
                        <select value={count} onChange={e => setCount(Number(e.target.value))} className="h-9 rounded-md border bg-white px-2 text-sm" aria-label="Questions in the set">
                            {CHAPTER_SET_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <span className="hidden text-xs text-slate-500 sm:inline">Test: {chapterTestMinutes(Math.min(count, available || count))} min</span>
                    <div className="w-full sm:w-64"><ModeButtons busyKey="chapters" starting={starting} disabled={chosen.size === 0} onPick={m => onStart([...chosen], count, m)} /></div>
                </div>
            </div>
        </div>
    )
}

function Empty({ text }: { text: string }) {
    return <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">{text}</p>
}
