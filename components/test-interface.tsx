"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

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

    useEffect(() => {
        if (!testId) return;
        setLoading(true)

        fetch("/api/admin/tests")
            .then(r => r.json())
            .then(tests => {
                const t = tests.find((x: any) => x.id === testId)
                if (t) {
                    setTest(t)
                    setLoading(false)
                } else {
                    setError("Test not found")
                    setLoading(false)
                }
            })
            .catch(e => {
                console.error(e)
                setError("Failed to load test")
                setLoading(false)
            })
    }, [testId])

    const handleAnswer = (val: string) => {
        if (!test) return
        const qId = test.questions[currentQuestion].id
        setAnswers({ ...answers, [qId]: parseInt(val) })
    }

    const handleSubmit = async () => {
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
        <Card className="w-full max-w-3xl mx-auto shadow-lg border-t-4 border-indigo-500">
            <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50">
                <div>
                    <CardTitle className="text-xl">{test.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {test.questions.length}</p>
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
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Test
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
