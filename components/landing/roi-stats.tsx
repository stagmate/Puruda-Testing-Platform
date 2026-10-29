"use client"

import { Users, Award, ShieldCheck, Clock } from "lucide-react"

export function RoiStats() {
    const stats = [
        {
            value: "100+",
            label: "Partner Institutions",
            subtext: "Coaching centers, schools & university colleges",
            icon: Users
        },
        {
            value: "500,000+",
            label: "Questions Evaluated",
            subtext: "With instantaneous scoring & negative marking",
            icon: Award
        },
        {
            value: "99.8%",
            label: "Proctoring Integrity",
            subtext: "Real-time tab switch & fullscreen enforcement",
            icon: ShieldCheck
        },
        {
            value: "8.5 Hrs",
            label: "Saved per Faculty / Week",
            subtext: "On automated paper generation & marking",
            icon: Clock
        }
    ]

    return (
        <section className="py-16 bg-white border-y border-slate-100 relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((s, idx) => {
                        const Icon = s.icon
                        return (
                            <div key={idx} className="space-y-2 text-center lg:text-left">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 mb-1">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                    {s.value}
                                </div>
                                <div className="text-sm font-bold text-slate-800">
                                    {s.label}
                                </div>
                                <p className="text-xs text-slate-500 leading-snug">
                                    {s.subtext}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
