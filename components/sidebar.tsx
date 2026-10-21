"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ADMIN_SECTIONS, adminSectionHref } from "@/lib/admin-sections"
import { LayoutDashboard, BookOpen, FileQuestion, PenTool, LogOut, type LucideIcon } from "lucide-react"

type NavRoute = { key: string; label: string; icon: LucideIcon; href: string; color: string }

interface SidebarProps {
    /** Called after a link is clicked, so the mobile drawer can close itself. */
    onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentTab = searchParams.get("tab")

    // The dashboard section is known from the URL; the middleware already
    // guarantees the user has the matching role.
    const isAdmin = pathname.startsWith("/admin")
    const isTeacher = pathname.startsWith("/teacher")
    const isStudent = pathname.startsWith("/student")

    const routes: NavRoute[] = [
        ...(isAdmin ? ADMIN_SECTIONS.map(s => ({
            key: s.key, label: s.label, icon: s.icon, color: s.color, href: adminSectionHref(s.key),
        })) : []),
        ...(isTeacher ? [
            { key: "overview", label: "Dashboard", icon: LayoutDashboard, href: "/teacher", color: "text-sky-400" },
            { key: "questions", label: "Question Bank", icon: BookOpen, href: "/teacher?tab=questions", color: "text-orange-400" },
            { key: "tests", label: "Tests", icon: PenTool, href: "/teacher?tab=tests", color: "text-emerald-400" },
        ] : []),
        ...(isStudent ? [
            { key: "overview", label: "My Dashboard", icon: LayoutDashboard, href: "/student", color: "text-sky-400" },
            { key: "report", label: "My Report", icon: FileQuestion, href: "/student/report", color: "text-emerald-400" },
        ] : []),
    ]

    const isActive = (route: NavRoute) => {
        const [path] = route.href.split("?")
        if (pathname !== path) return false
        return route.key === "overview" ? !currentTab || currentTab === "overview" : currentTab === route.key || route.key === "report"
    }

    return (
        <div className="flex h-full flex-col bg-slate-900 text-white">
            <div className="flex-1 overflow-y-auto px-3 py-4">
                <Link href="/" onClick={onNavigate} className="mb-8 flex items-center pl-3">
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
                        Puruda
                    </span>
                    {isAdmin && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">Admin</span>}
                </Link>
                <nav className="space-y-1" aria-label="Dashboard sections">
                    {routes.map((route) => {
                        const active = isActive(route)
                        return (
                            <Link
                                key={route.key + route.href}
                                href={route.href}
                                onClick={onNavigate}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex w-full items-center rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white",
                                    active ? "bg-white/10 text-white" : "text-zinc-400"
                                )}
                            >
                                <route.icon className={cn("mr-3 h-5 w-5 shrink-0", route.color)} />
                                {route.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="space-y-2 px-3 py-4">
                <div className="rounded-lg bg-slate-800 p-4">
                    <p className="mb-1 text-xs text-zinc-400">Need help?</p>
                    <p className="text-xs text-zinc-300">Ask the AI chatbot in the corner.</p>
                </div>
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center rounded-lg p-3 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                    <LogOut className="mr-3 h-5 w-5 text-red-400" />
                    Log out
                </button>
            </div>
        </div>
    )
}
