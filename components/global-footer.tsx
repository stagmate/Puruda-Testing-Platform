"use client"

import { usePathname } from "next/navigation"
import { isDashboardPath } from "@/lib/dashboard-routes"
import { GraduationCap } from "lucide-react"

export function GlobalFooter() {
    const pathname = usePathname()
    if (isDashboardPath(pathname)) return null

    return (
        <footer className="bg-slate-50 border-t py-8 mt-auto">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-sm">Puruda Classes Testing Platform</span>
                </div>
                <div className="text-sm">
                    © {new Date().getFullYear()} Puruda Classes. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
