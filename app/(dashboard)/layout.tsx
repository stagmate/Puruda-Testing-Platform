import { Sidebar } from "@/components/sidebar"
import { LogoutButton } from "@/components/logout-button"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <Sidebar />
            </div>
            <main className="md:pl-72 h-full bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
                {/* Mobile Header could go here */}
                {/* Navbar/TopBar */}
                <div className="flex items-center justify-end p-4 md:hidden">
                    {/* Mobile Sidebar Trigger would go here */}
                    <span className="font-bold">Puruda</span>
                </div>

                {children}
            </main>
        </div>
    )
}
