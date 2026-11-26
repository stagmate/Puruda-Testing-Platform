"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RichText } from "@/components/rich-text"
import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"
import { Loader2, ZoomIn, CheckCircle2, AlertTriangle, Eye, ShieldAlert, Clock, Check, CloudOff, CloudUpload, ChevronLeft, ChevronRight, LayoutGrid, LogOut, X, Eraser } from "lucide-react"
import { questionStatus, summarize, type QuestionStatus } from "@/lib/test-progress"
import { ImageViewer } from "@/components/image-viewer"
import { ResultReview } from "@/components/result-review"
import { cn } from "@/lib/utils"

interface TestInterfaceProps {
    testId: string
    onComplete?: () => void
}

type Answer = number | number[] | string

type StudentQuestion = {
    id: string
    text: string
    type?: "SINGLE" | "MULTIPLE" | "INTEGER"
    options: string[]
    imageUrl?: string | null
    optionAImageUrl?: string | null
    optionBImageUrl?: string | null
    optionCImageUrl?: string | null
    optionDImageUrl?: string | null
    subject?: string | null
}

type StudentTest = {
    id: string
    title: string
    questions: StudentQuestion[]
    deadline: string | null
    serverNow: string
    /** Answers saved earlier in this attempt (autosave), restored on reopening. */
    saved?: { answers: Record<string, Answer>; visited: number[] } | null
}

type SubmitResult = { score?: number; total?: number; resultMode: string }

const MAX_WARNINGS = 3
// Large, touch-friendly buttons for the test screen.
const BIG = "h-12 px-5 text-base"

function formatTime(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const mm = String(m).padStart(2, "0")
    const ss = String(s).padStart(2, "0")
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function optionImage(q: StudentQuestion, idx: number) {
    return [q.optionAImageUrl, q.optionBImageUrl, q.optionCImageUrl, q.optionDImageUrl][idx] || null
}

export function TestInterface({ testId, onComplete }: TestInterfaceProps) {
    const [test, setTest] = useState<StudentTest | null>(null)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState<Record<string, Answer>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<SubmitResult | null>(null)
    const [loadError, setLoadError] = useState("")
    const [submitError, setSubmitError] = useState("")
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    // Questions the student has opened (the first one is open on start).
    const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
    const [paletteOpen, setPaletteOpen] = useState(false)
    const [confirmSubmit, setConfirmSubmit] = useState(false)
    const [exitPrompt, setExitPrompt] = useState(false)
    const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

    // Anti-cheat state
    const [warnings, setWarnings] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Refs so event handlers and timers always see the latest values.
    const answersRef = useRef(answers)
    const submittingRef = useRef(false)
    const completedRef = useRef(false)
    const deadlineRef = useRef<number | null>(null)

    const completed = result !== null
    const fullscreenSupported = typeof document !== "undefined" && !!document.documentElement?.requestFullscreen

    const updateAnswers = (next: Record<string, Answer>) => {
        answersRef.current = next
        setAnswers(next)
        scheduleSave()
    }

    // --- Autosave: answers (and which questions were opened) are saved to the
    // server shortly after each change, retried while failing, and flushed when
    // the tab is hidden or closed.
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
    const visitedRef = useRef<Set<number>>(new Set([0]))
    const dirtyRef = useRef(false)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const savingRef = useRef(false)

    const saveNow = useCallback(async (keepalive = false) => {
        if (!dirtyRef.current || completedRef.current || submittingRef.current || (savingRef.current && !keepalive)) return
        dirtyRef.current = false
        savingRef.current = true
        setSaveState("saving")
        try {
            const res = await fetch(`/api/student/test/${testId}/answers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: answersRef.current, visited: Array.from(visitedRef.current) }),
                keepalive,
            })
            // 4xx (time up, already submitted): retrying won't help.
            if (!res.ok && res.status >= 500) throw new Error("save failed")
            setSaveState(res.ok ? "saved" : "error")
        } catch {
            dirtyRef.current = true // network trouble: try again on the next tick
            setSaveState("error")
        } finally {
            savingRef.current = false
        }
    }, [testId])

    const scheduleSave = () => {
        dirtyRef.current = true
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveNow(), 1000)
    }

    const handleSubmit = useCallback(async () => {
        if (submittingRef.current || completedRef.current) return
        submittingRef.current = true
        setSubmitting(true)
        setSubmitError("")
        try {
            const res = await fetch("/api/student/test/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testId, responses: answersRef.current })
            })
            if (!res.ok) throw new Error((await res.text()) || "Submit failed")

            const data: SubmitResult = await res.json()
            completedRef.current = true
            setResult(data)
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { })
        } catch (e) {
            console.error(e)
            setSubmitError(e instanceof Error && e.message ? e.message : "Failed to submit test. Please try again.")
        } finally {
            submittingRef.current = false
            setSubmitting(false)
        }
    }, [testId])

    // Load test
    useEffect(() => {
        if (!testId) return
        let cancelled = false

        fetch(`/api/student/test/${testId}`)
            .then(async r => {
                if (!r.ok) throw new Error((await r.text()) || r.statusText)
                return r.json() as Promise<StudentTest>
            })
            .then(t => {
                if (cancelled) return
                if (t.deadline) {
                    // Correct for the difference between the student's clock and the server's.
                    const skew = Date.now() - new Date(t.serverNow).getTime()
                    deadlineRef.current = new Date(t.deadline).getTime() + skew
                    setTimeLeft(deadlineRef.current - Date.now())
                }
                if (t.saved) {
                    // Reopened: put back what the student had answered and opened.
                    answersRef.current = t.saved.answers
                    setAnswers(t.saved.answers)
                    const seen = new Set([0, ...t.saved.visited])
                    t.questions.forEach((q, i) => { if (q.id in t.saved!.answers) seen.add(i) })
                    visitedRef.current = seen
                    setVisited(seen)
                    setSaveState("saved")
                }
                setTest(t)
                setLoading(false)
                requestFullscreen()
            })
            .catch(e => {
                if (cancelled) return
                console.error(e)
                setLoadError(e instanceof Error && e.message ? e.message : "Failed to load test")
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [testId])

    // Countdown timer: auto-submits when time runs out.
    useEffect(() => {
        if (!test || completed || deadlineRef.current === null) return
        const id = setInterval(() => {
            const remaining = deadlineRef.current! - Date.now()
            setTimeLeft(remaining)
            if (remaining <= 0) {
                clearInterval(id)
                handleSubmit()
            }
        }, 1000)
        return () => clearInterval(id)
    }, [test, completed, handleSubmit])

    const requestFullscreen = () => {
        const el = containerRef.current
        if (!el || !el.requestFullscreen) return
        el.requestFullscreen().catch(err => console.log("Fullscreen denied:", err))
    }

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [])

    // Anti-cheat: tab switching, right click, copy/paste
    useEffect(() => {
        if (completed || loading || !test) return

        const handleVisibilityChange = () => {
            if (!document.hidden) return
            setWarnings(prev => prev + 1)
        }
        const handleContextMenu = (e: MouseEvent) => e.preventDefault()
        const handleCopy = (e: ClipboardEvent) => e.preventDefault()

        document.addEventListener("visibilitychange", handleVisibilityChange)
        document.addEventListener("contextmenu", handleContextMenu)
        document.addEventListener("copy", handleCopy)
        document.addEventListener("paste", handleCopy)
        document.addEventListener("cut", handleCopy)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            document.removeEventListener("contextmenu", handleContextMenu)
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("paste", handleCopy)
            document.removeEventListener("cut", handleCopy)
        }
    }, [completed, loading, test])

    // Too many tab switches: submit whatever the student has answered so far.
    useEffect(() => {
        if (warnings >= MAX_WARNINGS && !completedRef.current) {
            alert("Test auto-submitted due to suspicious activity (multiple tab switches).")
            handleSubmit()
        }
    }, [warnings, handleSubmit])

    useEffect(() => {
        if (!test || completed) return
        const retry = setInterval(() => saveNow(), 15000)
        const flush = () => { if (document.visibilityState === "hidden") saveNow(true) }
        const onPageHide = () => saveNow(true)
        const onOnline = () => saveNow() // connection back: don't wait for the next retry
        document.addEventListener("visibilitychange", flush)
        window.addEventListener("pagehide", onPageHide)
        window.addEventListener("online", onOnline)
        return () => {
            clearInterval(retry)
            window.removeEventListener("online", onOnline)
            document.removeEventListener("visibilitychange", flush)
            window.removeEventListener("pagehide", onPageHide)
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [test, completed, saveNow])

    // Leaving mid-test: the browser Back button asks first (a history entry is
    // pushed so Back lands here instead of leaving) and exiting submits the test;
    // reload/close gets the browser's own leave-page warning.
    useEffect(() => {
        if (!test || completed) return
        window.history.pushState({ testGuard: true }, "")
        const onPopState = () => {
            window.history.pushState({ testGuard: true }, "")
            setExitPrompt(true)
        }
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (completedRef.current) return
            e.preventDefault()
            e.returnValue = ""
        }
        window.addEventListener("popstate", onPopState)
        window.addEventListener("beforeunload", onBeforeUnload)
        return () => {
            window.removeEventListener("popstate", onPopState)
            window.removeEventListener("beforeunload", onBeforeUnload)
        }
    }, [test, completed])

    // Exiting submits what the student has done so far, so the attempt is
    // recorded and scored (the "open every question" rule doesn't apply).
    const exitTest = async () => {
        setExitPrompt(false)
        await handleSubmit()
    }

    const goTo = (i: number) => {
        if (!test) return
        const next = Math.max(0, Math.min(test.questions.length - 1, i))
        setCurrentQuestion(next)
        if (!visitedRef.current.has(next)) {
            visitedRef.current = new Set(visitedRef.current).add(next)
            setVisited(visitedRef.current)
            scheduleSave()
        }
        setPaletteOpen(false)
    }

    const clearAnswer = () => {
        if (!test) return
        const next = { ...answersRef.current }
        delete next[test.questions[currentQuestion].id]
        updateAnswers(next)
    }

    const handleAnswer = (val: Answer) => {
        if (!test) return
        const qId = test.questions[currentQuestion].id
        updateAnswers({ ...answersRef.current, [qId]: val })
    }

    const handleCheckboxAnswer = (idx: number) => {
        if (!test) return
        const qId = test.questions[currentQuestion].id
        const prev = answersRef.current[qId]
        const currentArr = Array.isArray(prev) ? prev : []
        const newArr = currentArr.includes(idx) ? currentArr.filter(i => i !== idx) : [...currentArr, idx]
        updateAnswers({ ...answersRef.current, [qId]: newArr })
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    if (loadError) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-red-500">{loadError}</p>
                {onComplete && <Button variant="outline" onClick={onComplete}>Back to Dashboard</Button>}
            </div>
        )
    }
    if (!test || !test.questions || test.questions.length === 0) return <div className="p-8 text-center">Test has no questions.</div>

    if (result) {
        const showScore = typeof result.score === "number" && typeof result.total === "number"
        return (
            <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
                <div className="flex flex-col items-center gap-2 rounded-2xl border bg-white px-4 py-6 text-center shadow-sm animate-in zoom-in-95 duration-500">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                    <CardTitle className="text-2xl sm:text-3xl">Test submitted!</CardTitle>
                    <p className="text-muted-foreground">You have completed {test.title}.</p>
                    {!showScore && <p className="pt-2 text-slate-500">Your teacher will publish the results later.</p>}
                    <Button variant="outline" className={cn(BIG, "mt-2")} onClick={() => onComplete?.()}>Return to Dashboard</Button>
                </div>
                {/* Score summary, then every question with your answer, the correct answer and the solution. */}
                {showScore && <ResultReview testId={test.id} />}
                {showScore && (
                    <div className="flex justify-center pb-6">
                        <Button variant="outline" className={BIG} onClick={() => onComplete?.()}>Return to Dashboard</Button>
                    </div>
                )}
            </div>
        )
    }

    const question = test.questions[currentQuestion]
    const currentAnswer = answers[question.id]
    const qType = question.type || "SINGLE"
    const options = Array.isArray(question.options) ? question.options : []
    const lowTime = timeLeft !== null && timeLeft < 5 * 60 * 1000
    const progress = summarize(test.questions.map(q => q.id), answers, visited)
    const isLast = currentQuestion === test.questions.length - 1
    // Layout so the question fits on one screen.
    const hasDiagram = !!question.imageUrl
    const optionImages = options.some((_, i) => optionImage(question, i))
    const twoColumnOptions = options.length > 2 && (optionImages || options.every(o => o.length <= 60))
    const textLength = question.text?.length ?? 0
    const textSize = textLength > 600 ? "text-base" : textLength > 300 ? "text-lg" : "text-lg sm:text-xl"

    // Palette groups: consecutive questions of the same subject (the paper's parts).
    const groups: { subject: string | null; items: number[] }[] = []
    test.questions.forEach((q, i) => {
        const last = groups[groups.length - 1]
        if (last && last.subject === (q.subject ?? null)) last.items.push(i)
        else groups.push({ subject: q.subject ?? null, items: [i] })
    })

    const palette = (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Legend status="answered" label="Answered" count={progress.answered} />
                <Legend status="not-answered" label="Not answered" count={progress.notAnswered} />
                <Legend status="not-visited" label="Not visited" count={progress.notVisited} />
            </div>
            {groups.map((g, gi) => (
                <div key={gi}>
                    {g.subject && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.subject}</p>}
                    <div className="grid grid-cols-5 gap-2">
                        {g.items.map(i => (
                            <PaletteButton
                                key={i}
                                number={i + 1}
                                status={questionStatus(answers[test.questions[i].id], visited.has(i))}
                                current={i === currentQuestion}
                                onClick={() => goTo(i)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )

    return (
        <div ref={containerRef} className="fixed inset-0 z-40 flex flex-col bg-slate-100 select-none">
            {/* Fullscreen gate (skipped on devices that can't go fullscreen, e.g. iPhone) */}
            {fullscreenSupported && !isFullscreen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center backdrop-blur-sm">
                    <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold mb-2">Secure Test Environment Required</h2>
                    <p className="mb-6 max-w-md">
                        This test is strictly proctored. You must enable fullscreen mode to continue.
                        Exiting fullscreen or switching tabs is recorded as suspicious activity.
                    </p>
                    <Button onClick={requestFullscreen} className={cn(BIG, "h-14 px-8 bg-red-600 hover:bg-red-700 font-bold")}>
                        Enter Fullscreen Mode
                    </Button>
                </div>
            )}

            {/* Top bar */}
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-white px-3 py-2 sm:px-5">
                <Button variant="outline" className={cn(BIG, "px-4 lg:hidden")} onClick={() => setPaletteOpen(true)} aria-label="Show question list">
                    <LayoutGrid className="size-5" />{currentQuestion + 1}/{test.questions.length}
                </Button>
                <div className="order-first min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1">
                    <h1 className="truncate font-semibold text-slate-900">{test.title}</h1>
                    <p className="hidden text-xs text-slate-500 sm:flex sm:items-center sm:gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-red-500" />Proctoring active
                    </p>
                </div>
                <div className={cn("ml-auto flex items-center gap-1.5 text-sm sm:ml-0", warnings > 0 ? "font-bold text-red-600" : "text-slate-500")}>
                    <AlertTriangle className="h-4 w-4" /><span className="hidden sm:inline">Warnings</span> {warnings}/{MAX_WARNINGS}
                </div>
                <SaveIndicator state={saveState} />
                {timeLeft !== null && (
                    <div className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm tabular-nums", lowTime ? "border-red-200 bg-red-50 font-bold text-red-600" : "border-slate-200 text-slate-700")}>
                        <Clock className="h-4 w-4" />{formatTime(timeLeft)}
                    </div>
                )}
                <Button
                    onClick={() => setConfirmSubmit(true)}
                    disabled={!progress.canSubmit || submitting}
                    className={cn(BIG, "bg-green-600 px-6 font-semibold hover:bg-green-700")}
                    title={progress.canSubmit ? "Submit the test" : `Open every question to submit (${progress.notVisited} not visited yet)`}
                >
                    {submitting && <Loader2 className="mr-1 size-5 animate-spin" />}
                    Submit
                </Button>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* Question palette: left column on large screens, a drawer on small ones */}
                <aside className="hidden w-80 shrink-0 overflow-y-auto border-r bg-white p-4 lg:block" aria-label="Questions">
                    {palette}
                </aside>
                {paletteOpen && (
                    <div className="fixed inset-0 z-[45] flex lg:hidden">
                        <div className="w-[min(22rem,88vw)] overflow-y-auto bg-white p-4 shadow-xl" aria-label="Questions">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="font-semibold">Questions</p>
                                <Button variant="ghost" className="size-12" onClick={() => setPaletteOpen(false)} aria-label="Close question list"><X className="size-6" /></Button>
                            </div>
                            {palette}
                        </div>
                        <button type="button" className="flex-1 bg-black/40" aria-label="Close question list" onClick={() => setPaletteOpen(false)} />
                    </div>
                )}

                {/* Question: laid out to fit the screen without scrolling. With a diagram,
                    text and diagram sit on the left and the options on the right (large
                    screens); the diagram scales to the space left and opens full screen on tap. */}
                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-900">Question {currentQuestion + 1} of {test.questions.length}</span>
                            {question.subject && <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{question.subject}</span>}
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {qType === "MULTIPLE" ? "One or more correct" : qType === "INTEGER" ? "Numerical answer" : "Single correct"}
                            </span>
                            {submitError && <span className="text-sm text-red-600">{submitError}</span>}
                            {!progress.canSubmit && isLast && (
                                <span className="text-sm text-amber-700">Open every question before submitting: {progress.notVisited} not visited yet.</span>
                            )}
                        </div>

                        <div className={cn("flex min-h-0 flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm sm:p-5", hasDiagram && "flex-1 lg:flex-row lg:gap-6")}>
                            <section className={cn("flex min-h-0 flex-col gap-3", hasDiagram ? "flex-1 lg:w-1/2" : "shrink-0")}>
                                <div className={cn("shrink-0 whitespace-pre-line font-medium leading-relaxed text-slate-900", textSize)}>
                                    <RichText text={question.text} />
                                </div>
                                {question.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setZoom({ src: question.imageUrl!, alt: `Question ${currentQuestion + 1} diagram` })}
                                        className="group relative min-h-[140px] flex-1 cursor-zoom-in overflow-hidden rounded-lg border bg-slate-50"
                                        aria-label="Open the diagram full screen"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={question.imageUrl} alt="Question diagram" className="absolute inset-0 h-full w-full object-contain p-1" />
                                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white">
                                            <ZoomIn className="h-4 w-4" />Enlarge
                                        </span>
                                    </button>
                                )}
                            </section>

                            <section className={cn("flex min-h-0 flex-col justify-center", hasDiagram ? "shrink-0 lg:w-1/2" : "")}>
                                {qType === "INTEGER" ? (
                                    <label className="block space-y-2">
                                        <span className="text-sm text-slate-600">Enter your numerical answer</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="flex h-14 w-full max-w-md rounded-lg border-2 border-slate-300 bg-background px-4 text-xl focus-visible:border-indigo-500 focus-visible:outline-none"
                                            value={typeof currentAnswer === "string" ? currentAnswer : ""}
                                            onChange={e => handleAnswer(e.target.value)}
                                            placeholder="e.g. 42 or 2.5"
                                        />
                                    </label>
                                ) : (
                                    <div className={cn("grid gap-2", twoColumnOptions && "sm:grid-cols-2")} role={qType === "MULTIPLE" ? "group" : "radiogroup"} aria-label="Options">
                                        {options.map((opt, idx) => {
                                            const selected = qType === "MULTIPLE"
                                                ? Array.isArray(currentAnswer) && currentAnswer.includes(idx)
                                                : currentAnswer === idx
                                            const img = optionImage(question, idx)
                                            const letter = String.fromCharCode(65 + idx)
                                            const choose = () => (qType === "MULTIPLE" ? handleCheckboxAnswer(idx) : handleAnswer(idx))
                                            return (
                                                // The whole row is the control, edge to edge.
                                                <div
                                                    key={idx}
                                                    role={qType === "MULTIPLE" ? "checkbox" : "radio"}
                                                    aria-checked={selected}
                                                    tabIndex={0}
                                                    onClick={choose}
                                                    onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); choose() } }}
                                                    className={cn(
                                                        "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:px-4",
                                                        selected ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold",
                                                        qType === "MULTIPLE" ? "rounded-md" : "rounded-full",
                                                        selected ? "bg-indigo-600 text-white" : "border-2 border-slate-300 text-slate-600"
                                                    )}>
                                                        {selected && qType === "MULTIPLE" ? <Check className="size-5" /> : letter}
                                                    </span>
                                                    <span className="min-w-0 flex-1 text-base text-slate-900">
                                                        <RichText text={opt} />
                                                        {img && (
                                                            <span className="relative mt-1 block w-fit">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={img} alt={`Option ${letter}`} className="h-auto max-h-20 w-auto max-w-full rounded object-contain sm:max-h-24" />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label={`Open option ${letter} image full screen`}
                                                                    onClick={e => { e.stopPropagation(); setZoom({ src: img, alt: `Option ${letter}` }) }}
                                                                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setZoom({ src: img, alt: `Option ${letter}` }) } }}
                                                                    className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-black/80"
                                                                >
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
                            </section>
                        </div>
                    </div>

                    {/* Navigation */}
                    <footer className="flex items-center gap-2 border-t bg-white px-3 py-3 sm:gap-3 sm:px-8">
                        <Button variant="outline" className={BIG} onClick={() => goTo(currentQuestion - 1)} disabled={currentQuestion === 0}>
                            <ChevronLeft className="size-5" />Previous
                        </Button>
                        <Button variant="ghost" className={BIG} onClick={clearAnswer} disabled={progress.answered === 0 || currentAnswer === undefined}>
                            <Eraser className="size-5" /><span className="hidden sm:inline">Clear response</span><span className="sm:hidden">Clear</span>
                        </Button>
                        <div className="flex-1" />
                        {isLast ? (
                            <Button onClick={() => setConfirmSubmit(true)} disabled={!progress.canSubmit || submitting} className={cn(BIG, "bg-green-600 px-6 font-semibold hover:bg-green-700")}>
                                Submit test
                            </Button>
                        ) : (
                            <Button className={cn(BIG, "px-6 font-semibold")} onClick={() => goTo(currentQuestion + 1)}>
                                Next<ChevronRight className="size-5" />
                            </Button>
                        )}
                    </footer>
                </main>
            </div>

            {zoom && <ImageViewer src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}

            {/* Prompts are drawn inside the test so they stay visible in fullscreen. */}
            {confirmSubmit && (
                <Prompt
                    title="Submit the test?"
                    onClose={() => setConfirmSubmit(false)}
                    actions={<>
                        <Button variant="outline" className={BIG} onClick={() => setConfirmSubmit(false)}>Keep working</Button>
                        <Button className={cn(BIG, "bg-green-600 font-semibold hover:bg-green-700")} disabled={submitting} onClick={() => { setConfirmSubmit(false); handleSubmit() }}>
                            {submitting && <Loader2 className="size-5 animate-spin" />}Submit
                        </Button>
                    </>}
                >
                    <p>You answered <b>{progress.answered}</b> of {progress.total} questions{progress.notAnswered ? <>; <b>{progress.notAnswered}</b> unanswered</> : ""}.</p>
                    <p>You can&apos;t change your answers after submitting.</p>
                </Prompt>
            )}
            {exitPrompt && (
                <Prompt
                    title="Exit the test?"
                    tone="danger"
                    onClose={() => setExitPrompt(false)}
                    actions={<>
                        <Button className={cn(BIG, "font-semibold")} onClick={() => setExitPrompt(false)}>Stay in the test</Button>
                        <Button variant="outline" className={cn(BIG, "border-red-300 text-red-700 hover:bg-red-50")} disabled={submitting} onClick={exitTest}>
                            {submitting ? <Loader2 className="size-5 animate-spin" /> : <LogOut className="size-5" />}Submit &amp; exit
                        </Button>
                    </>}
                >
                    <p>If you exit now, your test is <b>submitted</b> with the answers you have given so far ({progress.answered} of {progress.total} answered) and your score is recorded.</p>
                    <p>You won&apos;t be able to take this test again.</p>
                </Prompt>
            )}
        </div>
    )
}

const STATUS_STYLE: Record<QuestionStatus, string> = {
    answered: "border-green-600 bg-green-600 text-white",
    "not-answered": "border-red-400 bg-red-50 text-red-700",
    "not-visited": "border-slate-300 bg-white text-slate-600",
}

function PaletteButton({ number, status, current, onClick }: { number: number; status: QuestionStatus; current: boolean; onClick: () => void }) {
    const label = { answered: "answered", "not-answered": "not answered", "not-visited": "not visited" }[status]
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Question ${number}, ${label}${current ? ", current" : ""}`}
            aria-current={current ? "step" : undefined}
            className={cn(
                "h-11 rounded-lg border-2 text-base font-semibold tabular-nums transition-colors",
                STATUS_STYLE[status],
                current && "ring-2 ring-indigo-600 ring-offset-2"
            )}
        >
            {number}
        </button>
    )
}

function Legend({ status, label, count }: { status: QuestionStatus; label: string; count: number }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md border-2 text-xs font-semibold", STATUS_STYLE[status])}>{count}</span>
            <span className="leading-tight text-slate-600">{label}</span>
        </div>
    )
}

function Prompt({ title, children, actions, onClose, tone }: { title: string; children: React.ReactNode; actions: React.ReactNode; onClose: () => void; tone?: "danger" }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-label={title} onClick={onClose}>
            <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className={cn("flex items-center gap-2 text-lg font-semibold", tone === "danger" && "text-red-700")}>
                    {tone === "danger" && <AlertTriangle className="h-5 w-5" />}{title}
                </h2>
                <div className="space-y-2 text-sm text-slate-700">{children}</div>
                <div className="flex flex-wrap justify-end gap-2">{actions}</div>
            </div>
        </div>
    )
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
    if (state === "idle") return null
    const view = {
        saving: { icon: <CloudUpload className="h-4 w-4 animate-pulse" />, text: "Saving…", cls: "text-slate-500" },
        saved: { icon: <Check className="h-4 w-4" />, text: "Saved", cls: "text-green-700" },
        error: { icon: <CloudOff className="h-4 w-4" />, text: "Not saved – retrying", cls: "font-medium text-amber-700" },
    }[state]
    return (
        <span className={cn("flex items-center gap-1 text-sm", view.cls)} role="status" aria-live="polite">
            {view.icon}<span className={state === "saved" ? "hidden sm:inline" : ""}>{view.text}</span>
        </span>
    )
}
