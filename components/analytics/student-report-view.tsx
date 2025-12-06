"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Printer, Download } from "lucide-react"

interface ReportData {
    student: {
        name: string
        email: string
        course: string
        batch: string
    }
    stats: {
        testsTaken: number
        averageAccuracy: number
        totalScore: number
        maxPossibleScore: number
    }
    subjectPerformance: { subject: string, accuracy: number }[]
    recentHistory: { test: string, score: number, total: number, date: string }[]
}

export function StudentReportView({ studentId }: { studentId?: string }) {
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetch("/api/analytics/report", {
            method: "POST",
            body: JSON.stringify({ studentId })
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to generate report")
                return res.json()
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [studentId])

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>
    if (error) return <div className="text-red-500 p-8 text-center border rounded bg-red-50">{error}</div>
    if (!data) return null

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white print:p-0">
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h1 className="text-2xl font-bold text-slate-900">Academic Progress Report</h1>
                <Button onClick={() => window.print()} variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" /> Print / Save PDF
                </Button>
            </div>

            {/* Report Content */}
            <div className="border rounded-xl p-8 shadow-sm print:shadow-none print:border-none">
                {/* Branding */}
                <div className="flex justify-between border-b pb-6 mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-indigo-600">Puruda Classes</h2>
                        <p className="text-sm text-muted-foreground">Excellence in Education</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-lg">{data.student.name}</p>
                        <p className="text-sm text-muted-foreground">{data.student.email}</p>
                        <p className="text-xs text-slate-500 mt-1">{data.student.course} • {data.student.batch}</p>
                    </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-indigo-600">{data.stats.averageAccuracy}%</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Avg Accuracy</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-slate-700">{data.stats.testsTaken}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Tests Taken</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-emerald-600">{data.stats.totalScore}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Score</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-slate-400">{data.stats.maxPossibleScore}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Max Possible</p>
                    </div>
                </div>

                {/* Subject Performance */}
                <div className="mb-8">
                    <h3 className="font-bold text-lg mb-4">Subject Performance</h3>
                    <div className="space-y-3">
                        {data.subjectPerformance.map(sub => (
                            <div key={sub.subject} className="flex items-center gap-4">
                                <span className="w-24 font-medium text-sm">{sub.subject}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all"
                                        style={{ width: `${sub.accuracy}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-slate-600">{sub.accuracy}%</span>
                            </div>
                        ))}
                        {data.subjectPerformance.length === 0 && <p className="text-sm text-slate-400">No subject data available.</p>}
                    </div>
                </div>

                {/* Recent Tests Table */}
                <div>
                    <h3 className="font-bold text-lg mb-4">Recent Test History</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3 rounded-tl-lg">Date</th>
                                <th className="p-3">Test Name</th>
                                <th className="p-3">Score</th>
                                <th className="p-3 rounded-tr-lg text-right">Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentHistory.map((h, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <td className="p-3">{new Date(h.date).toLocaleDateString()}</td>
                                    <td className="p-3 font-medium">{h.test}</td>
                                    <td className="p-3">{h.score} / {h.total}</td>
                                    <td className="p-3 text-right font-bold">
                                        {Math.round((h.score / h.total) * 100)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t text-center text-xs text-slate-400">
                    Generated by Puruda Platform on {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    )
}
