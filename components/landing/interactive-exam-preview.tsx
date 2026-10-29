"use client"

import { useState, useEffect } from "react"
import {
    CheckCircle2,
    Shield,
    Clock,
    AlertCircle,
    Sparkles,
    ChevronRight,
    Award,
    Flame,
    BarChart3,
    BookOpen,
    Users,
    Zap,
    Lock,
    Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"

const sampleQuestions = [
    {
        id: 1,
        subject: "Physics",
        topic: "Rotational Dynamics",
        difficulty: "ADVANCED",
        marks: "+4 / -1",
        question: "A uniform solid cylinder of mass M and radius R rolls without slipping down an inclined plane of angle θ. The acceleration of its center of mass is:",
        options: [
            { id: "A", text: "(2/3) g sin θ", correct: true },
            { id: "B", text: "(1/2) g sin θ", correct: false },
            { id: "C", text: "(3/4) g sin θ", correct: false },
            { id: "D", text: "g sin θ", correct: false }
        ],
        explanation: "For rolling without slipping, a = g sin θ / (1 + I/MR²). Since for a solid cylinder I = (1/2)MR², the denominator is 1 + 1/2 = 3/2. Thus, a = (2/3) g sin θ."
    },
    {
        id: 2,
        subject: "Chemistry",
        topic: "Chemical Kinetics",
        difficulty: "INTERMEDIATE",
        marks: "+4 / -1",
        question: "For a first-order reaction A → Products, the half-life t₁/₂ is 69.3 minutes. The rate constant k for this reaction is approximately:",
        options: [
            { id: "A", text: "0.001 min⁻¹", correct: false },
            { id: "B", text: "0.010 min⁻¹", correct: true },
            { id: "C", text: "0.100 min⁻¹", correct: false },
            { id: "D", text: "0.693 min⁻¹", correct: false }
        ],
        explanation: "k = ln(2) / t₁/₂ = 0.693 / 69.3 min = 0.010 min⁻¹."
    },
    {
        id: 3,
        subject: "Mathematics",
        topic: "Calculus",
        difficulty: "ADVANCED",
        marks: "+4 / 0",
        question: "Evaluate the limit: lim (x → 0) [(tan x - sin x) / x³]:",
        options: [
            { id: "A", text: "1/4", correct: false },
            { id: "B", text: "1/2", correct: true },
            { id: "C", text: "1", correct: false },
            { id: "D", text: "0", correct: false }
        ],
        explanation: "tan x - sin x = tan x (1 - cos x) = [tan x / x] * [2 sin²(x/2) / x²] * x³ / x³ → 1 * 2 * (1/4) = 1/2."
    }
]

export function InteractiveExamPreview() {
    const [activeTab, setActiveTab] = useState<"simulator" | "analytics" | "proctor">("simulator")
    const [currentIdx, setCurrentIdx] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
    const [showSolution, setShowSolution] = useState(false)
    const [timerSeconds, setTimerSeconds] = useState(3542)

    useEffect(() => {
        const interval = setInterval(() => {
            setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const formatTimer = (secs: number) => {
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    const currentQ = sampleQuestions[currentIdx]

    const handleSelectOption = (optId: string) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQ.id]: optId
        })
    }

    return (
        <section id="simulator" className="py-24 px-4 sm:px-6 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
            {/* Background blur effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="max-w-6xl mx-auto space-y-12">
                {/* Heading */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
                        <Zap className="h-3.5 w-3.5 text-indigo-600" /> Live Interactive Preview
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                        Experience the Test Engine{" "}
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            First-Hand
                        </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600">
                        See why coaching institutes and universities trust Puruda. Test-drive the real student examination console, live proctoring safeguards, and diagnostic scoreboards below.
                    </p>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex justify-center">
                    <div className="inline-flex p-1.5 bg-slate-200/70 backdrop-blur rounded-2xl border border-slate-300/60 shadow-inner">
                        <button
                            onClick={() => setActiveTab("simulator")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === "simulator"
                                    ? "bg-white text-indigo-700 shadow-md shadow-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <BookOpen className="h-4 w-4" /> Student Exam Console
                        </button>
                        <button
                            onClick={() => setActiveTab("analytics")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === "analytics"
                                    ? "bg-white text-indigo-700 shadow-md shadow-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <BarChart3 className="h-4 w-4" /> Live Leaderboard & Ranking
                        </button>
                        <button
                            onClick={() => setActiveTab("proctor")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === "proctor"
                                    ? "bg-white text-indigo-700 shadow-md shadow-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <Shield className="h-4 w-4" /> Anti-Cheat Proctor
                        </button>
                    </div>
                </div>

                {/* Tab 1: Student Exam Console */}
                {activeTab === "simulator" && (
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-indigo-950/5 overflow-hidden transition-all duration-300">
                        {/* Exam Header */}
                        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-400 text-sm">
                                    P
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm sm:text-base">JEE Mains All-India Mock 2026</h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-400/30">
                                            LIVE TEST
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">Batch: Morning Super-30 • Puruda Coaching Academy</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-xl text-xs font-mono text-amber-300">
                                    <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                                    <span>Time Left: {formatTimer(timerSeconds)}</span>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
                                    <Shield className="h-3.5 w-3.5" />
                                    Proctored (0 Warnings)
                                </div>
                            </div>
                        </div>

                        {/* Exam Body */}
                        <div className="grid lg:grid-cols-12 min-h-[460px]">
                            {/* Main Question Area */}
                            <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
                                <div className="space-y-6">
                                    {/* Question Meta */}
                                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 px-2.5 py-1 bg-slate-100 rounded-md">
                                                Question {currentIdx + 1} of {sampleQuestions.length}
                                            </span>
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-md">
                                                {currentQ.subject}
                                            </span>
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                                                {currentQ.topic}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">
                                                {currentQ.marks}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                                                {currentQ.difficulty}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 text-slate-900 font-medium text-base sm:text-lg leading-relaxed">
                                        {currentQ.question}
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-3">
                                        {currentQ.options.map((opt) => {
                                            const isSelected = selectedAnswers[currentQ.id] === opt.id
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleSelectOption(opt.id)}
                                                    className={`w-full text-left p-4 rounded-xl border text-sm sm:text-base font-medium transition-all flex items-center justify-between ${
                                                        isSelected
                                                            ? "bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                                                                isSelected
                                                                    ? "bg-indigo-600 text-white"
                                                                    : "bg-slate-100 text-slate-600"
                                                            }`}
                                                        >
                                                            {opt.id}
                                                        </span>
                                                        <span>{opt.text}</span>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* AI Solution Explanation Preview */}
                                    {showSolution && (
                                        <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-2 text-sm text-emerald-950 animate-in fade-in duration-300">
                                            <div className="flex items-center gap-2 font-bold text-emerald-800">
                                                <Sparkles className="h-4 w-4 text-emerald-600" />
                                                Puruda AI Step-by-Step Solution:
                                            </div>
                                            <p className="leading-relaxed text-xs sm:text-sm text-emerald-900">
                                                {currentQ.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowSolution(!showSolution)}
                                        className="text-xs h-9 text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                                        {showSolution ? "Hide AI Solution" : "Inspect AI Solution"}
                                    </Button>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentIdx === 0}
                                            onClick={() => {
                                                setCurrentIdx(currentIdx - 1)
                                                setShowSolution(false)
                                            }}
                                            className="text-xs h-9 border-slate-200"
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={currentIdx === sampleQuestions.length - 1}
                                            onClick={() => {
                                                setCurrentIdx(currentIdx + 1)
                                                setShowSolution(false)
                                            }}
                                            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            Next Question <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Question Palette & Exam Status */}
                            <div className="lg:col-span-4 bg-slate-50/60 p-6 flex flex-col justify-between space-y-6">
                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                            Question Navigation Palette
                                        </h4>
                                        <div className="grid grid-cols-5 gap-2">
                                            {sampleQuestions.map((q, idx) => {
                                                const isCurrent = currentIdx === idx
                                                const isAnswered = !!selectedAnswers[q.id]
                                                return (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => {
                                                            setCurrentIdx(idx)
                                                            setShowSolution(false)
                                                        }}
                                                        className={`h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                                                            isCurrent
                                                                ? "ring-2 ring-indigo-600 ring-offset-2 bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                                                : isAnswered
                                                                ? "bg-emerald-600 text-white"
                                                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                                        }`}
                                                    >
                                                        {idx + 1}
                                                    </button>
                                                )
                                            })}
                                            {/* Dummy place-holder questions to show realistic full grid */}
                                            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => (
                                                <div
                                                    key={n}
                                                    className="h-9 rounded-xl bg-white/70 border border-slate-200/60 text-slate-400 text-xs font-medium flex items-center justify-center select-none"
                                                >
                                                    {n}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Palette Legend */}
                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-200 pt-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded bg-emerald-600" /> Answered
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded bg-indigo-600" /> Current
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded bg-white border border-slate-300" /> Unattempted
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded bg-amber-400" /> Review Later
                                        </div>
                                    </div>

                                    {/* Anti-cheat live card */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                            <span className="flex items-center gap-1.5 text-indigo-700">
                                                <Shield className="h-4 w-4" /> Proctoring Guard
                                            </span>
                                            <span className="text-emerald-600 text-[11px]">ACTIVE</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">
                                            Fullscreen locked • Tab blur auto-detected • Copy-paste disabled • Device fingerprint verified.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <Button
                                        onClick={() => {
                                            alert("Simulated submit! In production, tests calculate negative marking, percentiles, and instant rankings.")
                                        }}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-600/20"
                                    >
                                        Submit Assessment
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Live Leaderboard & Ranking View */}
                {activeTab === "analytics" && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="h-5 w-5 text-amber-500" /> All-India Batch Leaderboard
                                </h3>
                                <p className="text-xs text-slate-500">Live rankings computed automatically upon test completion</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg">
                                    Batch: Morning JEE Super-30
                                </span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg">
                                    Tie-Breaker: Speed + Accuracy
                                </span>
                            </div>
                        </div>

                        {/* Leaderboard Table Mock */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider bg-slate-50/70">
                                        <th className="py-3 px-4 font-semibold">Rank</th>
                                        <th className="py-3 px-4 font-semibold">Student</th>
                                        <th className="py-3 px-4 font-semibold">Score</th>
                                        <th className="py-3 px-4 font-semibold">Accuracy</th>
                                        <th className="py-3 px-4 font-semibold">Time Taken</th>
                                        <th className="py-3 px-4 font-semibold">Percentile</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-amber-50/40 font-medium">
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-bold text-xs">
                                                🥇 1
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900">Aarav K. Patel</td>
                                        <td className="py-3 px-4 text-emerald-600 font-bold">296 / 300</td>
                                        <td className="py-3 px-4">98.7%</td>
                                        <td className="py-3 px-4 text-slate-500 font-mono">1h 42m</td>
                                        <td className="py-3 px-4 font-bold text-indigo-600">99.98%tile</td>
                                    </tr>
                                    <tr className="bg-slate-50/40">
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">
                                                🥈 2
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900">Sneha Sundaram</td>
                                        <td className="py-3 px-4 text-emerald-600 font-bold">288 / 300</td>
                                        <td className="py-3 px-4">96.0%</td>
                                        <td className="py-3 px-4 text-slate-500 font-mono">1h 51m</td>
                                        <td className="py-3 px-4 font-bold text-indigo-600">99.82%tile</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-900 font-bold text-xs">
                                                🥉 3
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900">Rohan Verma</td>
                                        <td className="py-3 px-4 text-emerald-600 font-bold">280 / 300</td>
                                        <td className="py-3 px-4">94.5%</td>
                                        <td className="py-3 px-4 text-slate-500 font-mono">1h 55m</td>
                                        <td className="py-3 px-4 font-bold text-indigo-600">99.55%tile</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 text-slate-500 font-bold pl-6">4</td>
                                        <td className="py-3 px-4 text-slate-800">Pooja Nair</td>
                                        <td className="py-3 px-4 text-emerald-600 font-semibold">272 / 300</td>
                                        <td className="py-3 px-4">92.0%</td>
                                        <td className="py-3 px-4 text-slate-500 font-mono">2h 04m</td>
                                        <td className="py-3 px-4 text-indigo-600 font-semibold">99.10%tile</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab 3: Anti-Cheat Proctor View */}
                {activeTab === "proctor" && (
                    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-800">
                                    <Shield className="h-3.5 w-3.5" /> High-Security Exam Sandbox
                                </div>
                                <h3 className="text-xl font-bold mt-2">Active Proctoring Telemetry</h3>
                            </div>
                            <span className="text-xs text-slate-400">Strict Enforcement Policy</span>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400 uppercase font-bold">Tab Switch Guard</span>
                                    <Lock className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div className="text-2xl font-black text-emerald-400">0 Violations</div>
                                <p className="text-xs text-slate-400">
                                    Detects background window switches, developer console inspection, and split-screen setups instantly.
                                </p>
                            </div>

                            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400 uppercase font-bold">Fullscreen Enforcement</span>
                                    <Eye className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div className="text-2xl font-black text-emerald-400">100% Locked</div>
                                <p className="text-xs text-slate-400">
                                    Exiting fullscreen gives immediate audible & visual warnings before automated test termination.
                                </p>
                            </div>

                            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400 uppercase font-bold">Paper Shuffle & Jumble</span>
                                    <Zap className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div className="text-2xl font-black text-emerald-400">Dynamic Seeds</div>
                                <p className="text-xs text-slate-400">
                                    Randomized question order and option sequencing ensures adjacent students have entirely different layouts.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
