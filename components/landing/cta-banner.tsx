"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck, Sparkles, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemoRequestDialog } from "./demo-request-dialog"

export function CtaBanner() {
    return (
        <section className="py-20 px-4 sm:px-6 bg-slate-900 relative overflow-hidden">
            {/* Background glowing gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    Transform Your Institutional Examination System
                </div>

                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
                    Ready to Deliver Secure, Scalable Assessments for Your Students?
                </h2>

                <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    Join premier coaching institutes, high schools, and degree colleges running thousands of tests with instant grading and AI-powered insights.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <DemoRequestDialog defaultTier="Institute Pro">
                        <Button
                            size="lg"
                            className="h-14 px-8 text-base font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
                        >
                            Request 14-Day Campus Trial <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </DemoRequestDialog>
                    <Link href="/login">
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 px-8 text-base font-bold rounded-2xl border-slate-700 text-white hover:bg-slate-800"
                        >
                            Existing User Login
                        </Button>
                    </Link>
                </div>

                <div className="pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" /> Anti-Cheat Proctoring Enabled
                    </div>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-400" /> Coaching, K-12 & University Ready
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" /> Instant Setup in Under 4 Hours
                    </div>
                </div>
            </div>
        </section>
    )
}
