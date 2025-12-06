"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertTriangle, Eye, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner" // Assuming sonner is available or use standard alert

interface TestInterfaceProps {
    testId: string
    onComplete?: () => void
}

export function TestInterface({ testId, onComplete }: TestInterfaceProps) {
    const router = useRouter()
    const [test, setTest] = useState<any>(null)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [score, setScore] = useState<{ score: number, total: number } | null>(null)
    const [error, setError] = useState("")

    // Anti-Cheat State
    const [warnings, setWarnings] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const MAX_WARNINGS = 3
    const containerRef = useRef<HTMLDivElement>(null)

    // Load Test
    useEffect(() => {
        if (!testId) return;
        setLoading(true)

        // Use the new specific API endpoint
        fetch(`/api/student/test/${testId}`)
            .then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    throw new Error(text || r.statusText);
                }
                return r.json();
            })
            .then(t => {
                setTest(t)
                setLoading(false)
                requestFullscreen() // Try to enforce fullscreen on load
            })
            .catch(e => {
                console.error(e)
                setError("Failed to load test")
                setLoading(false)
            })
    }, [testId])

    // Anti-Cheat: Fullscreen Enforcement
    const requestFullscreen = () => {
        if (containerRef.current) {
            containerRef.current.requestFullscreen().catch(err => {
                console.log("Fullscreen denied:", err)
            })
        }
    }

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement
            setIsFullscreen(isFull)
            if (!isFull && !completed && !loading) {
                // Optional: Count this as a warning or just annoying alert
            }
        }
        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [completed, loading])


    // Anti-Cheat: Tab Switching & Visibility
    useEffect(() => {
        if (completed || loading) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setWarnings(prev => {
                    const newCount = prev + 1
                    if (newCount >= MAX_WARNINGS) {
                        forceSubmit()
                    }
                    return newCount
                })
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)

        // Prevent Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => e.preventDefault()
        document.addEventListener("contextmenu", handleContextMenu)

        // Prevent Copy/Paste
        const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); return false; }
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
    }, [completed, loading])

    const forceSubmit = () => {
        alert("Test Auto-Submitted due to suspicious activity (multiple tab switches).")
        handleSubmit()
    }

    const handleAnswer = (val: string) => {
        if (!test) return
        const qId = test.questions[currentQuestion].id
        setAnswers({ ...answers, [qId]: parseInt(val) })
    }

    const handleSubmit = async () => {
        if (submitting || completed) return
        setSubmitting(true)
        try {
            const res = await fetch("/api/student/test/submit", {
                method: "POST",
                body: JSON.stringify({
                    testId,
                    responses: answers
                })
            })

            if (!res.ok) throw new Error(await res.text())

            const result = await res.json()
            setScore({ score: result.score, total: result.total })
            setCompleted(true)
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { })
            if (onComplete) onComplete()

        } catch (e) {
            console.error(e)
            setError("Failed to submit test. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    if (error) return <div className="text-red-500 p-8 text-center">{error}</div>
    if (!test || !test.questions || test.questions.length === 0) return <div className="p-8 text-center">Test has no questions.</div>

    if (completed && score) {
        return (
            <Card className="text-center py-10 animate-in zoom-in-95 duration-500">
                <CardContent className="space-y-4">
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-3xl">Test Submitted!</CardTitle>
                    <p className="text-muted-foreground">You have successfully completed {test.title}.</p>

                    <div className="py-6">
                        <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                            {score.score} / {score.total}
                        </div>
                        <p className="text-sm mt-2 text-slate-500">Your Score</p>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" onClick={() => router.push('/student')}>Return to Dashboard</Button>
                        <Button onClick={() => router.push('/student?tab=results')}>View Leaderboard</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const question = test.questions[currentQuestion]
    const currentAnswer = answers[question.id]

    return (
        <div ref={containerRef} className="bg-background min-h-screen flex flex-col items-center justify-center p-4">
            {/* Anti-Cheat Overlay for Fullscreen Warning */}
            {!isFullscreen && !loading && !completed && (
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

            <div className="w-full max-w-3xl mb-4 flex justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    <Eye className="h-4 w-4 animate-pulse" />
                    AI Proctoring Active
                </div>
                <div className={`flex items-center gap-2 ${warnings > 0 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
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
                    <h2 className="text-lg md:text-xl font-medium mb-8 leading-relaxed">
                        {question.text}
                    </h2>

                    <RadioGroup
                        value={currentAnswer !== undefined ? currentAnswer.toString() : ""}
                        onValueChange={handleAnswer}
                        className="space-y-4"
                    >
                        {question.options.map((opt: string, idx: number) => (
                            <div key={idx} className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${currentAnswer === idx ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'hover:bg-slate-50 hover:border-slate-300'}`}>
                                <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
                                <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-normal text-base">{opt}</Label>
                            </div>
                        ))}
                    </RadioGroup>
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
