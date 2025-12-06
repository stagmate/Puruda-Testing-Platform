"use client" // Convert to client component for demo toggle
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TestInterface } from "@/components/test-interface"
import { AIInsightCard } from "@/components/ai-insight-card"
import { LogoutButton } from "@/components/logout-button"
import { NewsWidget } from "@/components/news-widget"
import { StudentReviewsList } from "@/components/student-reviews-list"

export default function StudentDashboard() {
    const [showTest, setShowTest] = useState(false)
    const [selectedTestId, setSelectedTestId] = useState("")
    const [tests, setTests] = useState<any[]>([])

    // Fetch tests
    useState(() => {
        fetch("/api/admin/tests").then(r => r.json()).then(setTests)
    })

    if (showTest && selectedTestId) {
        return <TestInterface testId={selectedTestId} onComplete={() => setShowTest(false)} />
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                    Student Dashboard
                </h1>
                <LogoutButton />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* AI Analysis */}
                <div className="md:col-span-2">
                    <AIInsightCard />
                </div>

                {/* News & Updates */}
                <div className="md:col-span-1">
                    <NewsWidget />
                </div>

                {/* Reviews */}
                <div className="md:col-span-1">
                    <StudentReviewsList />
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold tracking-tight">Available Tests</h2>
                    <div className="grid gap-4">
                        {tests.length === 0 && <p className="text-muted-foreground">No active tests found.</p>}
                        {tests.map(test => (
                            <div key={test.id} className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">{test.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {test.questions?.length || "?"} Questions • {test.type}
                                    </p>
                                    {test.startTime && <p className="text-xs text-orange-600 mt-1">Starts: {new Date(test.startTime).toLocaleString()}</p>}
                                </div>
                                <Button
                                    onClick={() => { setSelectedTestId(test.id); setShowTest(true) }}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Start Test
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border rounded-xl bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">My Performance</h2>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/student/report'}>
                            View Full Report
                        </Button>
                    </div>
                    <div className="h-40 bg-white border border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                        Performance Chart Coming Soon
                    </div>
                </div>
            </div>
        </div>
    )
}
