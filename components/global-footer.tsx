"use client"

import { usePathname } from "next/navigation"
import { isDashboardPath } from "@/lib/dashboard-routes"
import Link from "next/link"
import { GraduationCap, ShieldCheck } from "lucide-react"

export function GlobalFooter() {
    const pathname = usePathname()
    if (isDashboardPath(pathname)) return null

    return (
        <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
                    {/* Brand & Description */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2.5 text-white">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <span className="font-black text-lg tracking-tight">Puruda Testing Platform</span>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                            The high-performance, proctored examination and test preparation engine for coaching academies, schools, and university campuses.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 p-2.5 rounded-xl w-fit">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>Enterprise Anti-Cheat Security & Proctoring</span>
                        </div>
                    </div>

                    {/* Solutions */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Solutions</h4>
                        <ul className="space-y-2 text-xs">
                            <li><a href="/#solutions" className="hover:text-white transition-colors">Coaching Institutes</a></li>
                            <li><a href="/#solutions" className="hover:text-white transition-colors">K-12 High Schools</a></li>
                            <li><a href="/#solutions" className="hover:text-white transition-colors">Colleges & Universities</a></li>
                            <li><a href="/#solutions" className="hover:text-white transition-colors">JEE / NEET Academies</a></li>
                            <li><a href="/#solutions" className="hover:text-white transition-colors">Placement Assessment</a></li>
                        </ul>
                    </div>

                    {/* Platform Features */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Capabilities</h4>
                        <ul className="space-y-2 text-xs">
                            <li><a href="/#simulator" className="hover:text-white transition-colors">Interactive Test Simulator</a></li>
                            <li><a href="/#features" className="hover:text-white transition-colors">Anti-Cheat Lockdown</a></li>
                            <li><a href="/#features" className="hover:text-white transition-colors">Question Bank & LaTeX</a></li>
                            <li><a href="/#features" className="hover:text-white transition-colors">Live Leaderboards</a></li>
                            <li><a href="/#features" className="hover:text-white transition-colors">Printable Test Papers</a></li>
                            <li><a href="/#features" className="hover:text-white transition-colors">AI Concept Tutor</a></li>
                        </ul>
                    </div>

                    {/* Licensing & Access */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Licensing</h4>
                        <ul className="space-y-2 text-xs">
                            <li><a href="/#pricing" className="hover:text-white transition-colors">Coaching Starter</a></li>
                            <li><a href="/#pricing" className="hover:text-white transition-colors">Institute Pro Plan</a></li>
                            <li><a href="/#pricing" className="hover:text-white transition-colors">Campus Enterprise</a></li>
                            <li><a href="/#pricing" className="hover:text-white transition-colors">Request 14-Day Trial</a></li>
                            <li><Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">Faculty / Student Login →</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-12 mt-12 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <div>
                        © {new Date().getFullYear()} Puruda Classes & Testing Platform. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#faq" className="hover:text-slate-300">Privacy & Data Security</a>
                        <a href="#faq" className="hover:text-slate-300">Terms of Licensing</a>
                        <a href="#faq" className="hover:text-slate-300">System Status</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
