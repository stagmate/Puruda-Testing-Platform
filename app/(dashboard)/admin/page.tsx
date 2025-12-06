"use client" // Needs client for Tabs

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"
import { UserManagement } from "@/components/user-management"
import { CourseManagement } from "@/components/course-management"
import { QuestionBankManagement } from "@/components/question-bank"
import { TestCreation } from "@/components/test-creation"
import { Leaderboard } from "@/components/leaderboard"
import { StudentPerformanceExplorer } from "@/components/analytics/student-performance-explorer"
import { CreateAnnouncementDialog } from "@/components/create-announcement-dialog"
import { NewsWidget } from "@/components/news-widget"
import { AdminReviewApproval } from "@/components/admin-review-approval"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, GraduationCap, BookOpen, PenTool } from "lucide-react"

import { Suspense } from "react"

function AdminDashboardContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const currentTab = searchParams.get("tab") || "overview"

    const onTabChange = (value: string) => {
        router.push(`/admin?tab=${value}`)
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-transparent bg-clip-text">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2">Manage your platform ecosystem.</p>
                </div>
                <LogoutButton />
            </div>

            {currentTab === "overview" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-blue-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-900">1,234</div>
                            <p className="text-xs text-blue-600">+20% from last month</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">Courses</CardTitle>
                            <GraduationCap className="h-4 w-4 text-purple-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-900">12</div>
                            <p className="text-xs text-purple-600">Active Batches: 8</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100 hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-700">Questions</CardTitle>
                            <BookOpen className="h-4 w-4 text-orange-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-900">5,678</div>
                            <p className="text-xs text-orange-600">Across 15 Subjects</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-700">Tests Created</CardTitle>
                            <PenTool className="h-4 w-4 text-emerald-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-900">89</div>
                            <p className="text-xs text-emerald-600">12 Scheduled Today</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Content Tabs */}
            <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">User Management</TabsTrigger>
                        <TabsTrigger value="courses">Courses & Batches</TabsTrigger>
                        <TabsTrigger value="questions">Question Bank</TabsTrigger>
                        <TabsTrigger value="tests">Test Creation</TabsTrigger>
                        <TabsTrigger value="results">Results & Rankings</TabsTrigger>
                        <TabsTrigger value="reviews">Approvals</TabsTrigger>
                        <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
                    </TabsList>
                    <CreateAnnouncementDialog />
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Stats Cards ... */}
                        <Card className="p-6 md:col-span-2">
                            <h3 className="font-semibold mb-4">Latest Announcements</h3>
                            <NewsWidget />
                        </Card>
                    </div>
                    <div className="p-4 bg-slate-50 rounded border text-muted-foreground text-center">
                        Select a module from the sidebar or tabs to manage Puruda Platform.
                    </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <Card className="border-none shadow-md">
                        <CardHeader><CardTitle>Manage Users</CardTitle></CardHeader>
                        <CardContent><UserManagement /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="courses" className="space-y-4">
                    <Card className="border-none shadow-md">
                        <CardHeader><CardTitle>Manage Courses</CardTitle></CardHeader>
                        <CardContent><CourseManagement /></CardContent>
                    </Card>
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

                <TabsContent value="results" className="space-y-4">
                    <ResultsView />
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6">
                    <h3 className="text-xl font-bold mb-4">Pending Teacher Reviews</h3>
                    <p className="text-muted-foreground mb-6">Approve or reject qualitative feedback submitted by teachers.</p>
                    <AdminReviewApproval />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <StudentPerformanceExplorer />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
            <AdminDashboardContent />
        </Suspense>
    )
}

function ResultsView() {
    const [tests, setTests] = useState<any[]>([])
    const [selectedTestId, setSelectedTestId] = useState<string>("")

    useEffect(() => {
        fetch("/api/admin/tests").then(r => r.json()).then(setTests)
    }, [])

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Select Test</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tests.map(t => (
                            <Button
                                key={t.id}
                                variant={selectedTestId === t.id ? "default" : "outline"}
                                className="justify-start h-auto py-3 px-4"
                                onClick={() => setSelectedTestId(t.id)}
                            >
                                <div className="text-left">
                                    <div className="font-semibold">{t.title}</div>
                                    <div className="text-xs opacity-70">{t.course?.name || "No Course"} • {new Date(t.createdAt).toLocaleDateString()}</div>
                                </div>
                            </Button>
                        ))}
                    </div>
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
