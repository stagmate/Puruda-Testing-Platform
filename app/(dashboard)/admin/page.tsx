"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { UserManagement } from "@/components/user-management"
import { CourseManagement } from "@/components/course-management"
import { QuestionBankManagement } from "@/components/question-bank"
import { TestCreation } from "@/components/test-creation"
import { Leaderboard } from "@/components/leaderboard"
import { StudentPerformanceExplorer } from "@/components/analytics/student-performance-explorer"
import { CreateAnnouncementDialog } from "@/components/create-announcement-dialog"
import { AdminReviewApproval } from "@/components/admin-review-approval"
import { AdminOverview } from "@/components/admin/admin-overview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAdminSection } from "@/lib/admin-sections"

function AdminDashboardContent() {
    const searchParams = useSearchParams()
    const section = getAdminSection(searchParams.get("tab"))

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24 md:space-y-6 md:p-8 md:pb-24">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Admin dashboard</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900 md:text-3xl">
                        <section.icon className="h-6 w-6 shrink-0 text-slate-400 md:h-7 md:w-7" />
                        <span className="truncate">{section.label}</span>
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
                <div className="shrink-0">
                    <CreateAnnouncementDialog />
                </div>
            </header>

            <SectionContent sectionKey={section.key} />
        </div>
    )
}

function SectionContent({ sectionKey }: { sectionKey: string }) {
    switch (sectionKey) {
        // Courses, questions and tests draw their own cards; users needs one.
        case "users":
            return <Card className="border-none shadow-md"><CardContent className="px-4 md:px-6"><UserManagement /></CardContent></Card>
        case "courses":
            return <CourseManagement />
        case "questions":
            return <QuestionBankManagement />
        case "tests":
            return <TestCreation />
        case "results":
            return <ResultsView />
        case "reviews":
            return <AdminReviewApproval />
        case "analytics":
            return <StudentPerformanceExplorer />
        default:
            return <AdminOverview />
    }
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div className="p-4 md:p-8">Loading dashboard...</div>}>
            <AdminDashboardContent />
        </Suspense>
    )
}

type TestSummary = { id: string; title: string; createdAt: string; course?: { name: string } | null }

function ResultsView() {
    const [tests, setTests] = useState<TestSummary[]>([])
    const [selectedTestId, setSelectedTestId] = useState<string>("")

    useEffect(() => {
        fetch("/api/admin/tests")
            .then(r => (r.ok ? r.json() : []))
            .then(setTests)
            .catch(() => setTests([]))
    }, [])

    return (
        <div className="space-y-4 md:space-y-6">
            <Card>
                <CardHeader className="px-4 md:px-6">
                    <CardTitle>Select test</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                    {tests.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-500">No tests yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {tests.map(t => (
                                <Button
                                    key={t.id}
                                    variant={selectedTestId === t.id ? "default" : "outline"}
                                    className="h-auto justify-start whitespace-normal px-4 py-3"
                                    onClick={() => setSelectedTestId(t.id)}
                                >
                                    <div className="min-w-0 text-left">
                                        <div className="font-semibold">{t.title}</div>
                                        <div className="text-xs opacity-70">{t.course?.name || "No course"} • {new Date(t.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedTestId && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Leaderboard testId={selectedTestId} />
                </div>
            )}
        </div>
    )
}
