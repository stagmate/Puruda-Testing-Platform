"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { isDashboardPath } from "@/lib/dashboard-routes"
import Link from "next/link"
import { GraduationCap, Menu, X, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemoRequestDialog } from "./landing/demo-request-dialog"

export function GlobalHeader() {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

    if (isDashboardPath(pathname)) return null

    return (
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-[100] h-16 sm:h-20 transition-all">
            <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
                {/* Brand Logo */}
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-lg font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-slate-900 bg-clip-text text-transparent leading-none">
                            Puruda Platform
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Testing & Examination Engine
                        </span>
                    </div>
                </Link>

                {/* Desktop Nav Items */}
                <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600">
                    <a href="/#solutions" className="hover:text-indigo-600 transition-colors">
                        Solutions
                    </a>
                    <a href="/#features" className="hover:text-indigo-600 transition-colors">
                        Features
                    </a>
                    <a href="/#simulator" className="hover:text-indigo-600 transition-colors flex items-center gap-1 text-indigo-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        Live Simulator
                    </a>
                    <a href="/#pricing" className="hover:text-indigo-600 transition-colors">
                        Licensing & Plans
                    </a>
                    <a href="/#faq" className="hover:text-indigo-600 transition-colors">
                        FAQ
                    </a>
                </nav>

                {/* Action CTAs */}
                <div className="hidden sm:flex items-center gap-3">
                    <DemoRequestDialog defaultTier="Institute Pro">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            Request Campus Demo
                        </Button>
                    </DemoRequestDialog>
                    <Link href="/login">
                        <Button
                            size="sm"
                            className="h-10 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 flex items-center gap-1.5"
                        >
                            Portal Login <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>

                {/* Mobile menu trigger */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                    aria-label="Toggle Navigation"
                >
                    {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2">
                    <div className="flex flex-col space-y-3 font-semibold text-sm text-slate-700">
                        <a
                            href="/#solutions"
                            onClick={() => setMobileOpen(false)}
                            className="py-1 hover:text-indigo-600"
                        >
                            Solutions (Coaching, Schools, Colleges)
                        </a>
                        <a
                            href="/#features"
                            onClick={() => setMobileOpen(false)}
                            className="py-1 hover:text-indigo-600"
                        >
                            Features & Anti-Cheat
                        </a>
                        <a
                            href="/#simulator"
                            onClick={() => setMobileOpen(false)}
                            className="py-1 text-indigo-600 font-bold"
                        >
                            Live Test Simulator
                        </a>
                        <a
                            href="/#pricing"
                            onClick={() => setMobileOpen(false)}
                            className="py-1 hover:text-indigo-600"
                        >
                            Institutional Licensing
                        </a>
                        <a
                            href="/#faq"
                            onClick={() => setMobileOpen(false)}
                            className="py-1 hover:text-indigo-600"
                        >
                            FAQ
                        </a>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                        <Link href="/login" onClick={() => setMobileOpen(false)}>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl">
                                Portal Login
                            </Button>
                        </Link>
                        <DemoRequestDialog defaultTier="Institute Pro">
                            <Button variant="outline" className="w-full font-semibold h-11 rounded-xl">
                                Request Campus Demo
                            </Button>
                        </DemoRequestDialog>
                    </div>
                </div>
            )}
        </header>
    )
}
