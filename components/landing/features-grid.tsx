"use client"

import {
    BrainCircuit,
    ShieldAlert,
    Database,
    Printer,
    FileSpreadsheet,
    Flame,
    LineChart,
    Sparkles,
    CheckCircle2,
    Layers,
    Clock,
    Lock
} from "lucide-react"

export function FeaturesGrid() {
    const features = [
        {
            icon: ShieldAlert,
            badge: "Zero-Compromise Security",
            title: "Proctored Anti-Cheat Sandbox",
            description: "Enforces full-screen examination mode, flags window defocus and tab switches in real time, and neutralizes copy-pasting to protect examination integrity.",
            color: "text-rose-600 bg-rose-50 border-rose-100",
            pill: "Active Proctoring"
        },
        {
            icon: Database,
            badge: "Deep Hierarchy",
            title: "Curriculum-Aligned Question Bank",
            description: "Catalog questions across Subjects, Chapters, Subtopics, and 3 difficulty tiers (Beginner, Intermediate, Advanced). Full support for LaTeX math formulas and diagrams.",
            color: "text-blue-600 bg-blue-50 border-blue-100",
            pill: "LaTeX & Diagrams"
        },
        {
            icon: LineChart,
            badge: "Live Telemetry",
            title: "Instant Ranking & Percentile Leaderboards",
            description: "No waiting for manual grading. Tests calculate negative marking, question-level accuracy, and percentile rank within milliseconds of student submission.",
            color: "text-purple-600 bg-purple-50 border-purple-100",
            pill: "Tie-Breaker Analytics"
        },
        {
            icon: BrainCircuit,
            badge: "24/7 AI Insights",
            title: "AI-Powered Concept Diagnostician",
            description: "Puruda AI analyzes student test submissions, pinpoints weak conceptual foundations, and delivers step-by-step mathematical derivations on demand.",
            color: "text-amber-600 bg-amber-50 border-amber-100",
            pill: "Instant Solutions"
        },
        {
            icon: FileSpreadsheet,
            badge: "Effortless Migration",
            title: "Bulk CSV & PDF Question Ingestion",
            description: "Upload your existing test repository in seconds. Parse questions, choices, answer keys, and difficulty ratings automatically without manual data entry.",
            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
            pill: "1,000s in Minutes"
        },
        {
            icon: Printer,
            badge: "Hybrid Capability",
            title: "One-Click Printable Test Papers",
            description: "Conducting offline mock tests on weekends? Generate beautifully formatted, publication-ready printable exam papers complete with separate teacher answer keys.",
            color: "text-indigo-600 bg-indigo-50 border-indigo-100",
            pill: "Offline Ready"
        }
    ]

    return (
        <section id="features" className="py-24 px-4 sm:px-6 bg-slate-50 relative">
            <div className="max-w-6xl mx-auto space-y-16">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider shadow-sm">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Comprehensive Test Infrastructure
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                        Engineered for Flawless{" "}
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Academic Evaluations
                        </span>
                    </h2>
                    <p className="text-slate-600 text-base md:text-lg">
                        Everything needed to create, proctor, evaluate, and diagnose assessments across thousands of students simultaneously.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {features.map((f, i) => {
                        const Icon = f.icon
                        return (
                            <div
                                key={i}
                                className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${f.color} transition-transform group-hover:scale-110 duration-300`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                            {f.pill}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
                                            {f.badge}
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 mt-1">
                                            {f.title}
                                        </h3>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        {f.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
