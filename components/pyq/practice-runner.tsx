"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eraser, LayoutGrid, Lightbulb, Loader2, LogOut, X, XCircle, ZoomIn, CircleDot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RichText } from "@/components/rich-text"
import { ImageViewer } from "@/components/image-viewer"
import { cn } from "@/lib/utils"

type Answer = number | number[] | string
type Feedback = { status: "correct" | "partial" | "wrong" | "unanswered"; correct: number[]; correctText: string; solution: string | null; marks?: number }
type Q = {
    id: string; type: "SINGLE" | "MULTIPLE" | "INTEGER"; text: string; options: string[]; imageUrl: string | null
    optionAImageUrl: string | null; optionBImageUrl: string | null; optionCImageUrl: string | null; optionDImageUrl: string | null
    subject: string | null; source: string | null; feedback?: Feedback
}
export type OpenAttempt = {
    id: string; title: string; mode: "PRACTICE" | "TEST"; marking: string
    deadline: string | null; serverNow: string; answers: Record<string, Answer>; timeSpent: Record<string, number>; questions: Q[]
}

const BIG = "h-12 px-5 text-base"
const answered = (a: Answer | undefined) => a !== undefined && a !== "" && !(Array.isArray(a) && a.length === 0)
const fmtClock = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
    return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/**
 * Solves a PYQ set. PRACTICE: untimed, "Check answer" locks the answer and shows
 * the correct option and solution. TEST: timed, answers revealed after submitting.
 * Each question is laid out to fit the screen without scrolling.
 */
export function PracticeRunner({ attempt, onFinished }: { attempt: OpenAttempt; onFinished: () => void }) {
    const router = useRouter()
    const practice = attempt.mode === "PRACTICE"
    const qs = attempt.questions
    const [current, setCurrent] = useState(0)
    const [answers, setAnswers] = useState<Record<string, Answer>>(attempt.answers)
    const [feedback, setFeedback] = useState<Record<string, Feedback>>(() => Object.fromEntries(qs.filter(q => q.feedback).map(q => [q.id, q.feedback!])))
    const [visited, setVisited] = useState<Set<number>>(() => new Set([0, ...qs.map((q, i) => (q.id in attempt.answers ? i : -1)).filter(i => i >= 0)]))
    const [paletteOpen, setPaletteOpen] = useState(false)
    const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)
    const [solutionOpen, setSolutionOpen] = useState(false)
    const [confirmSubmit, setConfirmSubmit] = useState(false)
    const [checking, setChecking] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    // Time spent per question: the clock runs for the question on screen.
    const timeRef = useRef<Record<string, number>>({ ...attempt.timeSpent })
    const shownAt = useRef<number>(0)
    const answersRef = useRef(answers)
    const dirty = useRef(false)
    const done = useRef(false)

    const flushTime = useCallback(() => {
        const q = qs[current]
        const now = Date.now()
        if (q && shownAt.current) timeRef.current[q.id] = (timeRef.current[q.id] ?? 0) + (now - shownAt.current) / 1000
        shownAt.current = now
    }, [qs, current])

    useEffect(() => { shownAt.current = Date.now() }, [current])

    const save = useCallback(async (keepalive = false) => {
        if (!dirty.current || done.current) return
        flushTime()
        dirty.current = false
        await fetch(`/api/practice/attempts/${attempt.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, keepalive,
            body: JSON.stringify({ answers: answersRef.current, timeSpent: timeRef.current }),
        }).catch(() => { dirty.current = true })
    }, [attempt.id, flushTime])

    // Autosave every 10 seconds and when the tab is hidden.
    useEffect(() => {
        const t = setInterval(() => { dirty.current = true; save() }, 10_000)
        const hide = () => { if (document.visibilityState === "hidden") { dirty.current = true; save(true) } }
        document.addEventListener("visibilitychange", hide)
        return () => { clearInterval(t); document.removeEventListener("visibilitychange", hide) }
    }, [save])

    const submit = useCallback(async () => {
        if (done.current) return
        setSubmitting(true)
        setError("")
        flushTime()
        const res = await fetch(`/api/practice/attempts/${attempt.id}/submit`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: answersRef.current, timeSpent: timeRef.current }),
        }).catch(() => null)
        if (!res?.ok) { setSubmitting(false); return setError("Couldn't submit. Check your connection and try again.") }
        done.current = true
        onFinished()
    }, [attempt.id, flushTime, onFinished])

    // Exam timer (test mode): submits when time runs out.
    useEffect(() => {
        if (!attempt.deadline) return
        const skew = Date.now() - new Date(attempt.serverNow).getTime()
        const end = new Date(attempt.deadline).getTime() + skew
        const tick = () => {
            const left = end - Date.now()
            setTimeLeft(left)
            if (left <= 0) submit()
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [attempt.deadline, attempt.serverNow, submit])

    const q = qs[current]
    const fb = feedback[q.id]
    const locked = !!fb
    const ans = answers[q.id]
    const opts = q.options ?? []
    const optionImage = (i: number) => [q.optionAImageUrl, q.optionBImageUrl, q.optionCImageUrl, q.optionDImageUrl][i] || null
    const hasDiagram = !!q.imageUrl
    const twoCols = opts.length > 2 && (opts.some((_, i) => optionImage(i)) || opts.every(o => o.length <= 60))
    const textSize = q.text.length > 600 ? "text-base" : q.text.length > 300 ? "text-lg" : "text-lg sm:text-xl"
    const answeredCount = qs.filter(x => answered(answers[x.id])).length

    const setAnswer = (a: Answer | undefined) => {
        if (locked) return
        const next = { ...answersRef.current }
        if (a === undefined) delete next[q.id]
        else next[q.id] = a
        answersRef.current = next
        setAnswers(next)
        dirty.current = true
    }
    const choose = (i: number) => {
        if (q.type === "MULTIPLE") {
            const cur = Array.isArray(ans) ? ans : []
            setAnswer(cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i].sort())
        } else setAnswer(i)
    }
    const goTo = (i: number) => {
        flushTime()
        const n = Math.max(0, Math.min(qs.length - 1, i))
        setCurrent(n)
        setVisited(v => new Set(v).add(n))
        setSolutionOpen(false)
        setPaletteOpen(false)
        if (dirty.current) save()
    }
    const check = async () => {
        if (!answered(ans)) return
        setChecking(true)
        setError("")
        flushTime()
        const res = await fetch(`/api/practice/attempts/${attempt.id}/check`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, answer: ans }),
        }).catch(() => null)
        setChecking(false)
        if (!res?.ok) return setError((await res?.text()) || "Couldn't check the answer")
        const r = await res.json()
        setFeedback(f => ({ ...f, [q.id]: r }))
    }

    const status = (i: number) => {
        const x = qs[i]
        const f = feedback[x.id]
        if (f) return f.status === "correct" ? "correct" : f.status === "partial" ? "partial" : "wrong"
        if (answered(answers[x.id])) return "answered"
        return visited.has(i) ? "skipped" : "new"
    }
    const STATUS_STYLE: Record<string, string> = {
        correct: "border-emerald-600 bg-emerald-600 text-white",
        partial: "border-amber-500 bg-amber-500 text-white",
        wrong: "border-red-500 bg-red-500 text-white",
        answered: "border-indigo-600 bg-indigo-600 text-white",
        skipped: "border-red-300 bg-red-50 text-red-700",
        new: "border-slate-300 bg-white text-slate-600",
    }
    const legend = practice
        ? [["correct", "Correct"], ["wrong", "Wrong"], ["answered", "Answered"], ["new", "Not seen"]]
        : [["answered", "Answered"], ["skipped", "Skipped"], ["new", "Not seen"]]

    const palette = (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-600">
                {legend.map(([k, label]) => <span key={k} className="flex items-center gap-1.5"><span className={cn("h-3.5 w-3.5 rounded border-2", STATUS_STYLE[k])} />{label}</span>)}
            </div>
            <div className="grid grid-cols-5 gap-2">
                {qs.map((_, i) => (
                    <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Question ${i + 1}`} aria-current={i === current ? "step" : undefined}
                        className={cn("h-11 rounded-lg border-2 text-base font-semibold tabular-nums", STATUS_STYLE[status(i)], i === current && "ring-2 ring-indigo-600 ring-offset-2")}>
                        {i + 1}
                    </button>
                ))}
            </div>
        </div>
    )

    const optionTone = (i: number, selected: boolean) => {
        if (!fb) return selected ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
        if (fb.correct.includes(i)) return "border-emerald-500 bg-emerald-50"
        if (selected) return "border-red-400 bg-red-50"
        return "border-slate-200 bg-white opacity-70"
    }

    return (
        <div className="fixed inset-0 z-[90] flex flex-col bg-slate-100">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-white px-3 py-2 sm:px-5">
                <Button variant="outline" className={cn(BIG, "px-4 lg:hidden")} onClick={() => setPaletteOpen(true)} aria-label="Show question list">
                    <LayoutGrid className="size-5" />{current + 1}/{qs.length}
                </Button>
                <div className="order-first min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1">
                    <h1 className="truncate font-semibold text-slate-900">{attempt.title}</h1>
                    <p className="text-xs text-slate-500">{practice ? "Practice mode · untimed" : "Test mode"} · {attempt.marking}</p>
                </div>
                {timeLeft !== null && (
                    <div className={cn("ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm tabular-nums sm:ml-0", timeLeft < 5 * 60_000 ? "border-red-200 bg-red-50 font-bold text-red-600" : "border-slate-200 text-slate-700")}>
                        <Clock className="h-4 w-4" />{fmtClock(timeLeft)}
                    </div>
                )}
                <Button variant="ghost" className={cn(BIG, "px-3", timeLeft === null && "ml-auto sm:ml-0")} onClick={async () => { dirty.current = true; await save(); router.push("/practice") }} title="Save and leave; resume any time">
                    <LogOut className="size-5" /><span className="hidden sm:inline">Save &amp; exit</span>
                </Button>
                <Button onClick={() => setConfirmSubmit(true)} disabled={submitting} className={cn(BIG, "bg-green-600 px-6 font-semibold hover:bg-green-700")}>
                    {submitting && <Loader2 className="size-5 animate-spin" />}{practice ? "Finish" : "Submit"}
                </Button>
            </header>

            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-80 shrink-0 overflow-y-auto border-r bg-white p-4 lg:block" aria-label="Questions">{palette}</aside>
                {paletteOpen && (
                    <div className="fixed inset-0 z-[45] flex lg:hidden">
                        <div className="w-[min(22rem,88vw)] overflow-y-auto bg-white p-4 shadow-xl">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="font-semibold">Questions</p>
                                <Button variant="ghost" className="size-12" onClick={() => setPaletteOpen(false)} aria-label="Close question list"><X className="size-6" /></Button>
                            </div>
                            {palette}
                        </div>
                        <button type="button" className="flex-1 bg-black/40" aria-label="Close question list" onClick={() => setPaletteOpen(false)} />
                    </div>
                )}

                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-900">Question {current + 1} of {qs.length}</span>
                            {q.subject && <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{q.subject}</span>}
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{q.type === "MULTIPLE" ? "One or more correct" : q.type === "INTEGER" ? "Numerical answer" : "Single correct"}</span>
                            {q.source && <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">{q.source}</span>}
                            {error && <span className="text-sm text-red-600">{error}</span>}
                        </div>

                        <div className={cn("flex min-h-0 flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm sm:p-5", hasDiagram && "flex-1 lg:flex-row lg:gap-6")}>
                            <section className={cn("flex min-h-0 flex-col gap-3", hasDiagram ? "flex-1 lg:w-1/2" : "shrink-0")}>
                                <div className={cn("shrink-0 whitespace-pre-line font-medium leading-relaxed text-slate-900", textSize)}><RichText text={q.text} /></div>
                                {q.imageUrl && (
                                    <button type="button" onClick={() => setZoom({ src: q.imageUrl!, alt: `Question ${current + 1} diagram` })}
                                        className="group relative min-h-[140px] flex-1 cursor-zoom-in overflow-hidden rounded-lg border bg-slate-50" aria-label="Open the diagram full screen">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={q.imageUrl} alt="Question diagram" className="absolute inset-0 h-full w-full object-contain p-1" />
                                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white"><ZoomIn className="h-4 w-4" />Enlarge</span>
                                    </button>
                                )}
                            </section>

                            <section className={cn("flex min-h-0 flex-col justify-center gap-3", hasDiagram ? "shrink-0 lg:w-1/2" : "")}>
                                {q.type === "INTEGER" ? (
                                    <div className="space-y-2">
                                        <label className="block space-y-2">
                                            <span className="text-sm text-slate-600">Enter your numerical answer</span>
                                            <input type="text" inputMode="decimal" disabled={locked}
                                                className={cn("flex h-14 w-full max-w-md rounded-lg border-2 bg-background px-4 text-xl focus-visible:outline-none", fb ? (fb.status === "correct" ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50") : "border-slate-300 focus-visible:border-indigo-500")}
                                                value={typeof ans === "string" ? ans : ""} onChange={e => setAnswer(e.target.value.trim() ? e.target.value : undefined)} placeholder="e.g. 42 or 2.5" />
                                        </label>
                                        {fb && fb.status !== "correct" && <p className="text-sm text-emerald-700">Correct answer: <b>{fb.correctText}</b></p>}
                                    </div>
                                ) : (
                                    <div className={cn("grid gap-2", twoCols && "sm:grid-cols-2")} role={q.type === "MULTIPLE" ? "group" : "radiogroup"} aria-label="Options">
                                        {opts.map((opt, i) => {
                                            const selected = q.type === "MULTIPLE" ? Array.isArray(ans) && ans.includes(i) : ans === i
                                            const img = optionImage(i)
                                            const letter = String.fromCharCode(65 + i)
                                            return (
                                                <div key={i} role={q.type === "MULTIPLE" ? "checkbox" : "radio"} aria-checked={selected} aria-disabled={locked} tabIndex={locked ? -1 : 0}
                                                    onClick={() => !locked && choose(i)}
                                                    onKeyDown={e => { if (!locked && (e.key === " " || e.key === "Enter")) { e.preventDefault(); choose(i) } }}
                                                    className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:px-4", locked ? "cursor-default" : "cursor-pointer", optionTone(i, selected))}>
                                                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold", q.type === "MULTIPLE" ? "rounded-md" : "rounded-full",
                                                        fb && fb.correct.includes(i) ? "bg-emerald-600 text-white" : fb && selected ? "bg-red-500 text-white" : selected ? "bg-indigo-600 text-white" : "border-2 border-slate-300 text-slate-600")}>
                                                        {fb && fb.correct.includes(i) ? <Check className="size-5" /> : fb && selected ? <X className="size-5" /> : selected && q.type === "MULTIPLE" ? <Check className="size-5" /> : letter}
                                                    </span>
                                                    <span className="min-w-0 flex-1 text-base text-slate-900">
                                                        <RichText text={opt} />
                                                        {img && (
                                                            <span className="relative mt-1 block w-fit">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={img} alt={`Option ${letter}`} className="h-auto max-h-20 w-auto max-w-full rounded object-contain sm:max-h-24" />
                                                                <span role="button" tabIndex={0} aria-label={`Open option ${letter} image full screen`}
                                                                    onClick={e => { e.stopPropagation(); setZoom({ src: img, alt: `Option ${letter}` }) }}
                                                                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setZoom({ src: img, alt: `Option ${letter}` }) } }}
                                                                    className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
                                                                    <ZoomIn className="h-3.5 w-3.5" />Enlarge
                                                                </span>
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {fb && (
                                    <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3", fb.status === "correct" ? "bg-emerald-50 text-emerald-800" : fb.status === "partial" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800")} role="status">
                                        <span className="flex items-center gap-2 font-semibold">
                                            {fb.status === "correct" ? <CheckCircle2 className="h-5 w-5" /> : fb.status === "partial" ? <CircleDot className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                            {fb.status === "correct" ? "Correct!" : fb.status === "partial" ? "Partly correct" : `Not quite. Answer: ${fb.correctText}`}
                                            {typeof fb.marks === "number" && <span className="font-normal opacity-80">({fb.marks > 0 ? "+" : ""}{fb.marks})</span>}
                                        </span>
                                        <Button variant="outline" className="h-9 bg-white" onClick={() => setSolutionOpen(true)}><Lightbulb className="h-4 w-4" />View solution</Button>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    <footer className="flex items-center gap-2 border-t bg-white px-3 py-3 sm:gap-3 sm:px-8">
                        <Button variant="outline" className={BIG} onClick={() => goTo(current - 1)} disabled={current === 0}><ChevronLeft className="size-5" /><span className="hidden sm:inline">Previous</span></Button>
                        {!locked && (
                            <Button variant="ghost" className={BIG} onClick={() => setAnswer(undefined)} disabled={!answered(ans)}><Eraser className="size-5" /><span className="hidden sm:inline">Clear</span></Button>
                        )}
                        <div className="flex-1" />
                        {practice && !locked && (
                            <Button onClick={check} disabled={!answered(ans) || checking} className={cn(BIG, "bg-emerald-600 font-semibold hover:bg-emerald-700")}>
                                {checking && <Loader2 className="size-5 animate-spin" />}Check answer
                            </Button>
                        )}
                        {current < qs.length - 1 ? (
                            <Button className={cn(BIG, "px-6 font-semibold")} onClick={() => goTo(current + 1)}>Next<ChevronRight className="size-5" /></Button>
                        ) : (
                            <Button onClick={() => setConfirmSubmit(true)} className={cn(BIG, "bg-green-600 px-6 font-semibold hover:bg-green-700")}>{practice ? "Finish" : "Submit"}</Button>
                        )}
                    </footer>
                </main>
            </div>

            {/* Solution panel (practice mode), on top of the question so the question itself never scrolls */}
            {solutionOpen && fb && (
                <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Solution" onClick={() => setSolutionOpen(false)}>
                    <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-indigo-900"><Lightbulb className="h-5 w-5" />Solution: Question {current + 1}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setSolutionOpen(false)} aria-label="Close solution"><X className="h-5 w-5" /></Button>
                        </div>
                        <p className="mb-3 text-sm text-slate-600">Correct answer: <b className="text-emerald-700">{fb.correctText}</b></p>
                        {fb.solution
                            ? <div className="whitespace-pre-line leading-relaxed text-slate-800"><RichText text={fb.solution} /></div>
                            : <p className="text-sm text-slate-500">No written solution has been added for this question yet.</p>}
                    </div>
                </div>
            )}

            {zoom && <ImageViewer src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}

            {confirmSubmit && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-label="Submit" onClick={() => setConfirmSubmit(false)}>
                    <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold">{practice ? "Finish this practice set?" : "Submit the test?"}</h2>
                        <p className="text-sm text-slate-700">You answered <b>{answeredCount}</b> of {qs.length} questions. You&apos;ll see your score, accuracy and the solutions next.</p>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" className={BIG} onClick={() => setConfirmSubmit(false)}>Keep going</Button>
                            <Button className={cn(BIG, "bg-green-600 font-semibold hover:bg-green-700")} disabled={submitting} onClick={submit}>
                                {submitting && <Loader2 className="size-5 animate-spin" />}{practice ? "Finish" : "Submit"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
