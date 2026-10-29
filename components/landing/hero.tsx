"use client"

import Link from "next/link"
import {
    ArrowRight,
    Sparkles,
    Shield,
    Award,
    CheckCircle2,
    Play,
    Building2,
    BookOpen,
    Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemoRequestDialog } from "./demo-request-dialog"

export function Hero() {
    return (
        <section className="relative pt-12 pb-24 px-4 sm:px-6 overflow-hidden bg-white">
            {/* Ambient background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/70 via-purple-50/40 to-transparent pointer-events-none -z-10" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-40 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="max-w-6xl mx-auto text-center space-y-8">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 text-xs sm:text-sm font-semibold shadow-sm hover:bg-indigo-100/70 transition-colors">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                    </span>
                    <span>Institutional Testing Platform for Coaching, Schools & Colleges</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-xs text-indigo-900 font-bold hidden sm:inline">2026 Ready</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-5xl mx-auto">
                    Master Exam Preparation with{" "}
                    <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Intelligent, Proctored Testing
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                    The all-in-one assessment engine built for <strong className="text-slate-900 font-semibold">Coaching Centers</strong>, <strong className="text-slate-900 font-semibold">K-12 Schools</strong>, and <strong className="text-slate-900 font-semibold">Degree Colleges</strong>. Deliver high-stakes test simulations (JEE, NEET, Board Finals) with anti-cheat lockdown, real-time rankings, and transparent institutional licensing.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <DemoRequestDialog defaultTier="Institute Pro">
                        <Button
                            size="lg"
                            className="h-14 px-8 text-base font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/25 transition-all hover:scale-105"
                        >
                            Get Institutional License <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </DemoRequestDialog>

                    <a href="#simulator">
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 px-8 text-base font-semibold rounded-2xl border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2"
                        >
                            <Play className="h-4 w-4 fill-indigo-600 text-indigo-600" />
                            Try Test Simulator
                        </Button>
                    </a>
                </div>

                {/* Trust Badges */}
                <div className="pt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>NTA / JEE / NEET Marking Pattern</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Anti-Cheat Fullscreen Sandbox</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Bulk CSV & PDF Ingestion</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Offline Printable Papers</span>
                    </div>
                </div>

                {/* Floating Mockup Hero Graphic */}
                <div className="pt-10 max-w-5xl mx-auto relative">
                    <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-slate-200/60 to-slate-100/40 border border-slate-200 shadow-2xl backdrop-blur-sm">
                        <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-left text-white space-y-6 relative overflow-hidden">
                            {/* Inner header */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base">
                                        P
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm sm:text-base text-white">
                                            Puruda Institutional Test Console
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            Active Test: All-India Physics Grand Mock • Super-30 Batch
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                                        <Shield className="h-3 w-3" /> Anti-Cheat: Enforced
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                                        Timer: 01:45:12
                                    </span>
                                </div>
                            </div>

                            {/* Simulated Question preview */}
                            <div className="grid md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-8 space-y-4">
                                    <div className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                                        Question 14 of 75 • Single Choice (+4 / -1)
                                    </div>
                                    <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                                        "In a Young's double slit experiment, the separation between the slits is halved and the distance between the screen and the slits is doubled. The fringe width will:"
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                        <div className="p-3 rounded-lg bg-indigo-600/30 border border-indigo-500 text-indigo-200 font-semibold flex items-center gap-2">
                                            <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-xs">
                                                A
                                            </span>
                                            Quadruple (4 times) ✓
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded bg-slate-700 text-slate-400 flex items-center justify-center text-xs">
                                                B
                                            </span>
                                            Double (2 times)
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded bg-slate-700 text-slate-400 flex items-center justify-center text-xs">
                                                C
                                            </span>
                                            Remain unchanged
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded bg-slate-700 text-slate-400 flex items-center justify-center text-xs">
                                                D
                                            </span>
                                            Halve (0.5 times)
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-4 bg-slate-800/90 rounded-xl p-4 border border-slate-700 space-y-4">
                                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                        <span>Live Batch Rank</span>
                                        <Award className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                                            <span>🥇 #1 Aarav Patel</span>
                                            <span>296 pts</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded bg-slate-700/60 text-slate-300">
                                            <span>🥈 #2 Sneha S.</span>
                                            <span>288 pts</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded bg-slate-700/60 text-slate-300">
                                            <span>🥉 #3 Rohan V.</span>
                                            <span>280 pts</span>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-400 border-t border-slate-700 pt-3 flex items-center gap-1.5">
                                        <Sparkles className="h-3 w-3 text-indigo-400" />
                                        <span>Instant AI scoring with negative marks</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
