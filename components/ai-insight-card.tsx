"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function AIInsightCard({ userId }: { userId?: string }) {
    const [analysis, setAnalysis] = useState("")
    const [loading, setLoading] = useState(false)

    const generateInsight = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/analytics/ai-insight", {
                method: "POST",
                body: JSON.stringify({ userId })
            })
            const data = await res.json()
            setAnalysis(data.analysis)
        } catch (e) {
            setAnalysis("Failed to generate insight. Please try again.")
        }
        setLoading(false)
    }

    return (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                    <Sparkles className="w-5 h-5" />
                    AI Tutor Insights
                </CardTitle>
                <CardDescription>Get personalized performance feedback powered by Gemini 2.0</CardDescription>
            </CardHeader>
            <CardContent>
                {!analysis ? (
                    <div className="text-center py-6">
                        <Button
                            onClick={generateInsight}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-pulse hover:animate-none"
                        >
                            {loading ? "Analyzing Performance..." : "Generate My Report"}
                        </Button>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none text-slate-700 animate-in fade-in duration-500">
                        {/* Simple rendering, normally use react-markdown given the API returns markdown */}
                        <div className="whitespace-pre-wrap">{analysis}</div>
                        <div className="mt-4 text-center">
                            <Button variant="outline" size="sm" onClick={generateInsight} disabled={loading}>
                                Refresh Analysis
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
