"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { LayoutDashboard, Users, BookOpen, FileQuestion, PenTool, GraduationCap } from "lucide-react"

export function Sidebar() {
    const pathname = usePathname()

    // Determine Role based on path (simple assumption)
    // In a real app we might use session, but path is reliable for active route highlighting
    const isAdmin = pathname.startsWith("/admin")
    const isTeacher = pathname.startsWith("/teacher")
    const isStudent = pathname.startsWith("/student")

    const routes = [
        // Admin Routes
        ...(isAdmin ? [
            { label: "Overview", icon: LayoutDashboard, href: "/admin", color: "text-sky-500" },
            { label: "Users", icon: Users, href: "/admin?tab=users", color: "text-violet-500" },
            { label: "Courses & Batches", icon: GraduationCap, href: "/admin?tab=courses", color: "text-pink-700" },
            { label: "Question Bank", icon: BookOpen, href: "/admin?tab=questions", color: "text-orange-700" },
            { label: "Tests", icon: PenTool, href: "/admin?tab=tests", color: "text-emerald-500" },
        ] : []),

        // Teacher Routes
        ...(isTeacher ? [
            { label: "Dashboard", icon: LayoutDashboard, href: "/teacher", color: "text-sky-500" },
            { label: "Question Bank", icon: BookOpen, href: "/teacher?tab=questions", color: "text-orange-700" },
            { label: "Tests", icon: PenTool, href: "/teacher?tab=tests", color: "text-emerald-500" },
        ] : []),

        // Student Routes
        ...(isStudent ? [
            { label: "My Dashboard", icon: LayoutDashboard, href: "/student", color: "text-sky-500" },
            { label: "Available Tests", icon: FileQuestion, href: "/student", color: "text-emerald-500" },
        ] : [])
    ]

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/" className="flex items-center pl-3 mb-14">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
                        Puruda
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.label + route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "bg-white/10 text-white" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                <div className="bg-slate-800 p-4 rounded-lg mb-4">
                    <p className="text-xs text-zinc-400 mb-2">Need Help?</p>
                    <p className="text-xs text-zinc-300">Ask the AI Chatbot!</p>
                </div>
                {/* Logout moved here for easy access */}
                {/* Actually, LogoutButton is already in top bar, but we can have it here too or just removal from pages */}
            </div>
        </div>
    )
}
