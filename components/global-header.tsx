import { GraduationCap } from "lucide-react"
import Link from "next/link"

export function GlobalHeader() {
    return (
        <header className="bg-white border-b sticky top-0 z-[100] h-16 shadow-sm">
            <div className="container mx-auto h-full px-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <GraduationCap className="h-8 w-8 text-indigo-600" />
                    <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                        Puruda Classes Testing Platform
                    </h1>
                </Link>

                {/* Optional: Add global nav items here if needed, or keep it clean as a banner */}
                <div className="text-sm font-medium text-slate-500 hidden sm:block">
                    Excellence in Assessment
                </div>
            </div>
        </header>
    )
}
