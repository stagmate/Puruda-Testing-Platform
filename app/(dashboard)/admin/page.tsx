"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { UserManagement } from "@/components/user-management"
import { CourseManagement } from "@/components/course-management"
import { QuestionBankManagement } from "@/components/question-bank"
import { TestCreation } from "@/components/test-creation"
import { Leaderboard } from "@/components/leaderboard"
import { StudentPerformanceExplorer } from "@/components/analytics/student-performance-explorer"
import { AnnouncementManager } from "@/components/admin/announcement-manager"
import { PyqPapers } from "@/components/admin/pyq-papers"
import { AdminReviewApproval } from "@/components/admin-review-approval"
import { AdminOverview } from "@/components/admin/admin-overview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAdminSection } from "@/lib/admin-sections"

function AdminDashboardContent() {
    const searchParams = useSearchParams()
    const section = getAdminSection(searchParams.get("tab"))

    return (
        <div className="flex min-h-screen w-full flex-col">
            {/* Page header stays in view while the section scrolls (below the mobile top bar on small screens). */}
            <header className="sticky top-14 z-30 border-b border-slate-200 bg-white px-4 py-3 md:top-0 md:px-6 md:py-4">
                <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                    <section.icon className="h-5 w-5 shrink-0 text-indigo-500 md:h-6 md:w-6" />
                    <span className="truncate">{section.label}</span>
                </h1>
                {section.description && <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>}
            </header>

            <div className="w-full flex-1 space-y-4 px-4 py-4 pb-24 md:space-y-6 md:px-6 md:py-6 md:pb-24">
                <SectionContent sectionKey={section.key} />
            </div>
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
        case "pyq":
            return <PyqPapers />
        case "announcements":
            return <AnnouncementManager />
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
