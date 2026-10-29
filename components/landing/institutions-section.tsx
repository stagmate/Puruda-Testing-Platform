"use client"

import { useState } from "react"
import {
    GraduationCap,
    School,
    Building2,
    CheckCircle2,
    ArrowRight,
    Trophy,
    FileSpreadsheet,
    Printer,
    Users2,
    Sparkles,
    ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemoRequestDialog } from "./demo-request-dialog"

export function InstitutionsSection() {
    const [selectedInst, setSelectedInst] = useState<"coaching" | "schools" | "colleges">("coaching")

    const institutionData = {
        coaching: {
            icon: Trophy,
            title: "Coaching Centers & Test Prep Academies",
            badge: "Rank-Boosting Engine",
            tagline: "Build All-India Rankers with High-Stakes Competitive Exam Simulation",
            description: "Engineered specifically for JEE Mains/Advanced, NEET, CUET, and Foundation batches. Simulate exact NTA-pattern examinations with negative marking, time-pressure analytics, and real-time rank leaderboards.",
            keyPoints: [
                "Exact NTA/JEE/NEET marking schemes (+4 / -1, partial MSQ marking)",
                "Instant Batch Leaderboards with speed & accuracy percentiles",
                "Bulk Question Import from CSV & PDFs with diagrams & LaTeX formulas",
                "One-Click Printable Test Papers with answer keys for offline weekend mock exams",
                "Chapter & Subtopic difficulty segregation (Beginner, Intermediate, Advanced)"
            ],
            metric: "43%",
            metricLabel: "Higher student retention & top-percentile rank conversion",
            defaultTier: "Institute Pro"
        },
        schools: {
            icon: School,
            title: "K-12 Schools & High Schools",
            badge: "Continuous Assessment",
            tagline: "Modernize Formative Assessments & Relieve Teachers from Manual Grading",
            description: "Seamlessly align chapter-wise unit tests and term finals with CBSE, ICSE, and State curricula. Free your faculty from manual paper correction and provide parents with crystal-clear diagnostic progress cards.",
            keyPoints: [
                "Curriculum alignment by Subject → Chapter → Subtopic hierarchy",
                "Instant automated grading saving teachers 8+ hours every week",
                "Comprehensive Student Performance Cards ready for parent-teacher conferences",
                "Role-based teacher portals for assigning homework and mock tests",
                "Zero-installation student portal accessible from smartphones, tablets, and lab PCs"
            ],
            metric: "8.5 hrs",
            metricLabel: "Saved per teacher per week on manual question setting & grading",
            defaultTier: "Institute Pro"
        },
        colleges: {
            icon: Building2,
            title: "Colleges & Degree Universities",
            badge: "High-Concurrency Campus",
            tagline: "Scalable, Secure Digital Exams for Semester Finals & Placement Drives",
            description: "Deliver simultaneous, tamper-proof examinations for hundreds of students across multiple university departments. Robust anti-cheat sandboxing and centralized academic gradebook exports.",
            keyPoints: [
                "Strict Fullscreen Enforcement & Tab Switch violation telemetry",
                "Department & Course-wide multi-batch scheduling with strict access windows",
                "Custom grading schemas for technical, science, and humanities courses",
                "Detailed exportable CSV gradebooks for registrar and university records",
                "Enterprise single-sign-on (SSO) and campus-wide licensing tiers"
            ],
            metric: "99.9%",
            metricLabel: "Proctoring integrity with zero unauthorized device switches",
            defaultTier: "Campus Enterprise"
        }
    }

    const current = institutionData[selectedInst]

    return (
        <section id="solutions" className="py-24 px-4 sm:px-6 bg-slate-900 text-white relative overflow-hidden">
            {/* Glow accent */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-16 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                        <GraduationCap className="h-3.5 w-3.5" /> Tailored Educational Solutions
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight">
                        Built for Every Stage of{" "}
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                            Academic Assessment
                        </span>
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg">
                        Whether you are training future Olympiad rankers, managing high school midterms, or conducting university finals — Puruda scales seamlessly to your workflow.
                    </p>
                </div>

                {/* Institution Selector Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {(Object.keys(institutionData) as Array<keyof typeof institutionData>).map((key) => {
                        const item = institutionData[key]
                        const isSelected = selectedInst === key
                        const Icon = item.icon
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedInst(key)}
                                className={`p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-3 ${
                                    isSelected
                                        ? "bg-gradient-to-br from-indigo-950/80 to-slate-800 border-indigo-500 shadow-xl shadow-indigo-950/50 scale-[1.02]"
                                        : "bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isSelected
                                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
                                                : "bg-slate-800 text-slate-500"
                                        }`}
                                    >
                                        {item.badge}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-white">{item.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                        {item.tagline}
                                    </p>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Selected Institution Detail Card */}
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900/90 rounded-3xl border border-slate-700/80 p-8 sm:p-12 shadow-2xl grid lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
                            <Sparkles className="h-3 w-3" />
                            {current.badge}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                            {current.tagline}
                        </h3>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                            {current.description}
                        </p>

                        <div className="space-y-3 pt-2">
                            {current.keyPoints.map((pt, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm text-slate-200">
                                    <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                                    <span>{pt}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 flex flex-wrap items-center gap-4">
                            <DemoRequestDialog defaultTier={current.defaultTier}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-12 px-6 rounded-xl shadow-lg shadow-indigo-600/30">
                                    Book An Institute Demo <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </DemoRequestDialog>
                            <a
                                href="#pricing"
                                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                            >
                                View Licensing Plans →
                            </a>
                        </div>
                    </div>

                    {/* Stats & Capability Highlights */}
                    <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-700/60 p-6 sm:p-8 space-y-6">
                        <div className="space-y-2 border-b border-slate-800 pb-6">
                            <div className="text-4xl sm:text-5xl font-black text-indigo-400 tracking-tight">
                                {current.metric}
                            </div>
                            <div className="text-sm font-medium text-slate-300">
                                {current.metricLabel}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h5 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                                Platform Capabilities Included
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-400 mb-1" />
                                    <div className="text-xs font-bold text-white">CSV & PDF Import</div>
                                    <div className="text-[10px] text-slate-400">Zero re-typing</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                    <Printer className="h-4 w-4 text-indigo-400 mb-1" />
                                    <div className="text-xs font-bold text-white">Offline Print Mode</div>
                                    <div className="text-[10px] text-slate-400">Clean exam sheets</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                    <ShieldCheck className="h-4 w-4 text-amber-400 mb-1" />
                                    <div className="text-xs font-bold text-white">Anti-Cheat Proctor</div>
                                    <div className="text-[10px] text-slate-400">Fullscreen lock</div>
                                </div>
                                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                    <Users2 className="h-4 w-4 text-purple-400 mb-1" />
                                    <div className="text-xs font-bold text-white">Role Delegation</div>
                                    <div className="text-[10px] text-slate-400">Teachers & batches</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
