import {
    LayoutDashboard, Users, GraduationCap, BookOpen, PenTool, Trophy, ClipboardCheck, Sparkles,
    type LucideIcon,
} from "lucide-react"

export type AdminSection = {
    key: string
    label: string
    description: string
    icon: LucideIcon
    color: string
}

// Single source of truth for the admin dashboard's sections: the sidebar, the
// mobile menu and the page header all read from this list.
export const ADMIN_SECTIONS: AdminSection[] = [
    { key: "overview", label: "Overview", description: "Platform activity at a glance", icon: LayoutDashboard, color: "text-sky-400" },
    { key: "users", label: "Users", description: "Add, find and remove accounts", icon: Users, color: "text-violet-400" },
    { key: "courses", label: "Courses & Batches", description: "Courses, batches, subjects and enrolments", icon: GraduationCap, color: "text-pink-400" },
    { key: "questions", label: "Question Bank", description: "Create, import and organise questions", icon: BookOpen, color: "text-orange-400" },
    { key: "tests", label: "Tests", description: "Build, schedule and publish tests", icon: PenTool, color: "text-emerald-400" },
    { key: "results", label: "Results & Rankings", description: "Leaderboards for each test", icon: Trophy, color: "text-amber-400" },
    { key: "reviews", label: "Approvals", description: "Approve or reject teacher feedback", icon: ClipboardCheck, color: "text-rose-400" },
    { key: "analytics", label: "AI Analytics", description: "Explore individual student performance", icon: Sparkles, color: "text-cyan-400" },
]

export function getAdminSection(key: string | null | undefined): AdminSection {
    return ADMIN_SECTIONS.find(s => s.key === key) ?? ADMIN_SECTIONS[0]
}

export function adminSectionHref(key: string) {
    return key === "overview" ? "/admin" : `/admin?tab=${key}`
}
