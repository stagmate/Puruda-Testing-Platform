import { Suspense } from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative h-full">
            {/* Desktop: fixed sidebar */}
            <div className="fixed inset-y-0 z-[80] hidden h-full bg-slate-900 md:flex md:w-72 md:flex-col">
                <Suspense>
                    <Sidebar />
                </Suspense>
            </div>
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 md:pl-72">
                {/* Mobile: top bar with a slide-in menu */}
                <Suspense>
                    <MobileNav />
                </Suspense>
                {children}
            </main>
        </div>
    )
}
