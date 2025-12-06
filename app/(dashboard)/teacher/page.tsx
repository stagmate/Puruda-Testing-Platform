"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"
import { QuestionBankManagement } from "@/components/question-bank"
import { TestCreation } from "@/components/test-creation"
import { StudentPerformanceExplorer } from "@/components/analytics/student-performance-explorer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, PenTool } from "lucide-react"
import { CreateReviewDialog } from "@/components/create-review-dialog"

import { Suspense } from "react"

function TeacherDashboardContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const currentTab = searchParams.get("tab") || "overview"

    const onTabChange = (value: string) => {
        router.push(`/teacher?tab=${value}`)
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage your batches, assignments and track student progress.</p>
                </div>
                <div className="flex gap-3">
                    <CreateReviewDialog />
                    <LogoutButton />
                </div>
            </div>

            {/* Quick Stats - Shown on overview */}
            {currentTab === "overview" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100 hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-700">Questions Contributed</CardTitle>
                            <BookOpen className="h-4 w-4 text-orange-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-900">142</div>
                            <p className="text-xs text-orange-600">This week: +12</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-700">Active Tests</CardTitle>
                            <PenTool className="h-4 w-4 text-emerald-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-900">4</div>
                            <p className="text-xs text-emerald-600">Assigned to 3 Batches</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-4">
                <TabsList className="bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="questions">Question Bank</TabsTrigger>
                    <TabsTrigger value="tests">Test Creation</TabsTrigger>
                    <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <div className="p-4 bg-slate-50 rounded border text-muted-foreground text-center">
                        Select a module to get started.
                    </div>
                </TabsContent>

                <TabsContent value="questions" className="space-y-4">
                    <Card className="border-none shadow-md">
                        <CardHeader><CardTitle>Question Repository</CardTitle></CardHeader>
                        <CardContent><QuestionBankManagement /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tests" className="space-y-4">
                    <Card className="border-none shadow-md">
                        <CardHeader><CardTitle>Create & Publish Tests</CardTitle></CardHeader>
                        <CardContent><TestCreation /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <StudentPerformanceExplorer />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function TeacherDashboard() {
    return (
        <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
            <TeacherDashboardContent />
        </Suspense>
    )
}
