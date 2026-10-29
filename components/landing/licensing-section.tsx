"use client"

import { useState } from "react"
import { Check, Sparkles, Building, ShieldCheck, Zap, ArrowRight, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemoRequestDialog } from "./demo-request-dialog"

export function LicensingSection() {
    const [annual, setAnnual] = useState(true)

    const tiers = [
        {
            name: "Coaching Starter",
            badge: "Single Center",
            desc: "Ideal for growing tutoring academies and individual coaching centers preparing up to 250 students.",
            monthlyPrice: 3999,
            annualPrice: 3199,
            popular: false,
            features: [
                "Up to 250 Active Enrolled Students",
                "Up to 5 Dedicated Batches",
                "Complete Question Bank Management",
                "Bulk CSV Question Ingestion",
                "Instant Test Scoring & Negative Marking",
                "One-Click Printable Exam Papers",
                "Standard Email Support",
                "Standard Proctoring Warning Alerts"
            ],
            cta: "Choose Starter",
            tierValue: "Coaching Starter"
        },
        {
            name: "Institute Pro",
            badge: "Most Popular for Schools & Academies",
            desc: "Designed for competitive exam institutes and high schools requiring AI diagnostics and proctoring.",
            monthlyPrice: 8999,
            annualPrice: 7199,
            popular: true,
            features: [
                "Up to 1,500 Active Enrolled Students",
                "Unlimited Course Batches & Sections",
                "Strict Fullscreen Anti-Cheat Proctoring",
                "24/7 Puruda AI Tutor & Problem Explainer",
                "Live All-India / All-Institute Leaderboards",
                "Teacher Assignment & Progress Review Roles",
                "Automated PDF Parent Report Cards",
                "Bulk PDF & CSV Question Importer",
                "Priority WhatsApp & Phone Support"
            ],
            cta: "Get Institute Pro License",
            tierValue: "Institute Pro"
        },
        {
            name: "Campus Enterprise",
            badge: "Colleges & Multi-Branch",
            desc: "Complete campus-wide deployment for degree colleges, universities, and multi-city coaching chains.",
            monthlyPrice: null, // Custom
            annualPrice: null,
            popular: false,
            features: [
                "Unlimited Active Students & Batches",
                "Multi-Branch & Campus Administration",
                "Custom Branding & Subdomain (e.g. tests.yourcollege.edu)",
                "Full Anti-Cheat Sandbox & Tab Telemetry",
                "Custom Gradebook & SIS/LMS API Integrations",
                "Dedicated Account Manager & Training Sessions",
                "99.9% Uptime Enterprise SLA Guarantee",
                "Optional On-Premise / Private Cloud Hosting"
            ],
            cta: "Request Campus License",
            tierValue: "Campus Enterprise"
        }
    ]

    return (
        <section id="pricing" className="py-24 px-4 sm:px-6 bg-white relative">
            <div className="max-w-6xl mx-auto space-y-16">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" /> Institutional Subscriptions & Licensing
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                        Predictable Licensing for{" "}
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Every Educational Scale
                        </span>
                    </h2>
                    <p className="text-slate-600 text-base md:text-lg">
                        Zero hidden fees per student test. Choose an annual or quarterly institutional license with full feature access and dedicated onboarding.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <span className={`text-sm font-semibold ${!annual ? "text-slate-900" : "text-slate-400"}`}>
                            Billed Monthly
                        </span>
                        <button
                            onClick={() => setAnnual(!annual)}
                            className="w-14 h-8 bg-slate-900 rounded-full p-1 relative transition-colors"
                        >
                            <div
                                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                                    annual ? "translate-x-6 bg-indigo-500" : "translate-x-0"
                                }`}
                            />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${annual ? "text-slate-900" : "text-slate-400"}`}>
                                Billed Annually
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                Save 20%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 items-stretch">
                    {tiers.map((t, idx) => (
                        <div
                            key={idx}
                            className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                                t.popular
                                    ? "bg-slate-900 text-white shadow-2xl shadow-indigo-950/20 ring-2 ring-indigo-500 scale-105 z-10"
                                    : "bg-white text-slate-900 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1"
                            }`}
                        >
                            {t.popular && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                                    Recommended for Institutes
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <span
                                        className={`text-xs font-bold tracking-wider uppercase ${
                                            t.popular ? "text-indigo-400" : "text-indigo-600"
                                        }`}
                                    >
                                        {t.badge}
                                    </span>
                                    <h3 className="text-2xl font-black mt-1">{t.name}</h3>
                                    <p
                                        className={`text-xs mt-2 leading-relaxed ${
                                            t.popular ? "text-slate-400" : "text-slate-500"
                                        }`}
                                    >
                                        {t.desc}
                                    </p>
                                </div>

                                {/* Price block */}
                                <div className="py-2 border-y border-slate-100/10">
                                    {t.monthlyPrice !== null ? (
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-bold text-slate-400">₹</span>
                                            <span className="text-4xl font-black tracking-tight">
                                                {annual ? t.annualPrice?.toLocaleString() : t.monthlyPrice?.toLocaleString()}
                                            </span>
                                            <span className={`text-xs ${t.popular ? "text-slate-400" : "text-slate-500"}`}>
                                                / month
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            <div className="text-3xl font-black">Custom License</div>
                                            <span className={`text-xs ${t.popular ? "text-slate-400" : "text-slate-500"}`}>
                                                Volume pricing based on campus enrollment
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Feature list */}
                                <div className="space-y-3">
                                    <div
                                        className={`text-xs font-bold uppercase tracking-wider ${
                                            t.popular ? "text-slate-300" : "text-slate-700"
                                        }`}
                                    >
                                        Included in this license:
                                    </div>
                                    <ul className="space-y-2.5">
                                        {t.features.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm">
                                                <div
                                                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                        t.popular
                                                            ? "bg-indigo-500/20 text-indigo-400"
                                                            : "bg-indigo-50 text-indigo-600"
                                                    }`}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </div>
                                                <span className={t.popular ? "text-slate-300" : "text-slate-600"}>
                                                    {feat}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="pt-8 mt-6 border-t border-slate-100/10">
                                <DemoRequestDialog defaultTier={t.tierValue}>
                                    <Button
                                        className={`w-full h-11 rounded-xl font-bold text-sm transition-all shadow-md ${
                                            t.popular
                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30"
                                                : "bg-slate-900 hover:bg-slate-800 text-white"
                                        }`}
                                    >
                                        {t.cta}
                                    </Button>
                                </DemoRequestDialog>
                                <p
                                    className={`text-[11px] text-center mt-2 ${
                                        t.popular ? "text-slate-400" : "text-slate-400"
                                    }`}
                                >
                                    Includes 14-day full evaluation trial
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Enterprise reassurance bar */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-base">
                            Need a tailored multi-branch license or custom student quota?
                        </h4>
                        <p className="text-slate-600 text-xs sm:text-sm">
                            We offer custom contracts, on-premise deployments, and white-label branding for large institutional networks.
                        </p>
                    </div>
                    <DemoRequestDialog defaultTier="Custom Multi-Branch">
                        <Button variant="outline" className="h-11 px-6 border-slate-300 text-slate-800 font-semibold text-sm shrink-0">
                            Speak with Institutional Sales
                        </Button>
                    </DemoRequestDialog>
                </div>
            </div>
        </section>
    )
}
