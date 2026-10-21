"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertTriangle, Eye, ShieldAlert, Clock } from "lucide-react"

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
}

type StudentTest = {
    id: string
    title: string
    questions: StudentQuestion[]
    deadline: string | null
    serverNow: string
}

type SubmitResult = { score?: number; total?: number; resultMode: string }

const MAX_WARNINGS = 3

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
            <Card className="text-center py-10 animate-in zoom-in-95 duration-500">
                <CardContent className="space-y-4">
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-3xl">Test Submitted!</CardTitle>
                    <p className="text-muted-foreground">You have successfully completed {test.title}.</p>

                    {showScore ? (
                        <div className="py-6">
                            <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                                {result.score} / {result.total}
                            </div>
                            <p className="text-sm mt-2 text-slate-500">Your Score</p>
                        </div>
                    ) : (
                        <p className="py-6 text-slate-500">Your teacher will publish the results later.</p>
                    )}

                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" onClick={() => onComplete?.()}>Return to Dashboard</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const question = test.questions[currentQuestion]
    const currentAnswer = answers[question.id]
    const qType = question.type || "SINGLE"
    const options = Array.isArray(question.options) ? question.options : []
    const lowTime = timeLeft !== null && timeLeft < 5 * 60 * 1000

    return (
        <div ref={containerRef} className="bg-background min-h-screen flex flex-col items-center justify-center p-4">
            {/* Fullscreen gate (skipped on devices that can't go fullscreen, e.g. iPhone) */}
            {fullscreenSupported && !isFullscreen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center backdrop-blur-sm">
                    <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold mb-2">Secure Test Environment Required</h2>
                    <p className="mb-6 max-w-md">
                        This test is strictly proctored. You must enable fullscreen mode to continue.
                        Exiting fullscreen or switching tabs is recorded as suspicious activity.
                    </p>
                    <Button onClick={requestFullscreen} size="lg" className="bg-red-600 hover:bg-red-700 font-bold">
                        Enter Fullscreen Mode
                    </Button>
                </div>
            )}

            <div className="w-full max-w-3xl mb-4 flex flex-wrap gap-2 justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    <Eye className="h-4 w-4 animate-pulse" />
                    AI Proctoring Active
                </div>
                {timeLeft !== null && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border tabular-nums ${lowTime ? "text-red-600 border-red-200 bg-red-50 font-bold" : "text-slate-700 border-slate-200"}`}>
                        <Clock className="h-4 w-4" />
                        {formatTime(timeLeft)}
                    </div>
                )}
                <div className={`flex items-center gap-2 ${warnings > 0 ? "text-red-500 font-bold" : "text-slate-500"}`}>
                    <AlertTriangle className="h-4 w-4" />
                    Warnings: {warnings}/{MAX_WARNINGS}
                </div>
            </div>

            <Card className="w-full max-w-3xl mx-auto shadow-2xl border-t-4 border-indigo-500 select-none">
                <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50">
                    <div>
                        <CardTitle className="text-xl">{test.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {test.questions.length}</p>
                    </div>
                    {/* Simulated Camera Feed Placeholder (Optional) */}
                    <div className="hidden md:block h-16 w-24 bg-black rounded overflow-hidden relative border border-slate-300">
                        <div className="absolute top-1 left-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="flex items-center justify-center h-full text-[10px] text-slate-500">USER CAMERA</div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8 min-h-[300px]">
                    <h2 className="text-lg md:text-xl font-medium mb-4 leading-relaxed">
                        <span className="text-sm font-bold text-slate-500 mr-2 uppercase tracking-wide">[{qType}]</span>
                        {question.text}
                    </h2>
                    {question.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={question.imageUrl} alt="Question diagram" className="mb-8 max-h-72 rounded border" />
                    )}

                    {qType === "INTEGER" ? (
                        <div className="space-y-4">
                            <Label className="text-base text-muted-foreground">Enter your numerical answer:</Label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-xl ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={typeof currentAnswer === "string" ? currentAnswer : ""}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder="e.g. 42"
                            />
                        </div>
                    ) : qType === "MULTIPLE" ? (
                        <div className="space-y-4">
                            {options.map((opt, idx) => {
                                const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(idx)
                                const img = optionImage(question, idx)
                                return (
                                    <div key={idx} onClick={() => handleCheckboxAnswer(idx)} className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${isSelected ? "border-indigo-500 bg-indigo-50 shadow-sm" : "hover:bg-slate-50 hover:border-slate-300"}`}>
                                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                                            {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </div>
                                        <Label className="flex-1 cursor-pointer font-normal text-base pointer-events-none">
                                            {opt}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {img && <img src={img} alt="" className="mt-2 max-h-32 rounded" />}
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <RadioGroup
                            value={typeof currentAnswer === "number" ? currentAnswer.toString() : ""}
                            onValueChange={(val) => handleAnswer(parseInt(val))}
                            className="space-y-4"
                        >
                            {options.map((opt, idx) => {
                                const img = optionImage(question, idx)
                                return (
                                    <div key={idx} className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${currentAnswer === idx ? "border-indigo-500 bg-indigo-50 shadow-sm" : "hover:bg-slate-50 hover:border-slate-300"}`}>
                                        <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
                                        <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-normal text-base">
                                            {opt}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {img && <img src={img} alt="" className="mt-2 max-h-32 rounded" />}
                                        </Label>
                                    </div>
                                )
                            })}
                        </RadioGroup>
                    )}

                    {submitError && <p className="mt-6 text-sm text-red-600">{submitError}</p>}
                </CardContent>
                <CardFooter className="flex justify-between bg-slate-50 p-6 border-t">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                    >
                        Previous
                    </Button>

                    {currentQuestion < test.questions.length - 1 ? (
                        <Button onClick={() => setCurrentQuestion(prev => prev + 1)}>
                            Next
                        </Button>
                    ) : (
                        <Button onClick={() => handleSubmit()} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Test
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
