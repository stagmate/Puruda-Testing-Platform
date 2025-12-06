"use client"

import { StudentReportView } from "@/components/analytics/student-report-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ReportPage() {
    const router = useRouter()
    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="bg-white border-b px-8 py-4 mb-4 print:hidden">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
            <StudentReportView />
        </div>
    )
}
