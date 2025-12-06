"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function AdminReviewApproval() {
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchReviews = () => {
        setLoading(true)
        fetch("/api/reviews?status=PENDING")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setReviews(data)
                else setReviews([])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchReviews()
    }, [])

    const handleAction = async (reviewId: string, status: "APPROVED" | "REJECTED") => {
        try {
            await fetch("/api/reviews", {
                method: "PATCH",
                body: JSON.stringify({ reviewId, status })
            })
            // Remove from list immediately for better UX
            setReviews(prev => prev.filter(r => r.id !== reviewId))
        } catch (error) {
            console.error(error)
            alert("Failed to update status")
        }
    }

    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin inline-block" /> Loading pending reviews...</div>

    if (reviews.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    No pending reviews to approve.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                    <CardHeader className="bg-slate-50 py-3 border-b flex flex-row justify-between items-center">
                        <div>
                            <span className="font-semibold">{review.student.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">Review by {review.teacher.name}</span>
                        </div>
                        <div className="text-xs font-mono bg-white px-2 py-1 rounded border">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 grid gap-4 md:grid-cols-[1fr_200px]">
                        <div>
                            <div className="mb-2">
                                <span className="text-xs font-bold uppercase text-slate-500 mr-2">Subject/Test</span>
                                <span className="text-sm font-medium">{review.subjectId || review.test?.title || "General"}</span>
                            </div>
                            <div className="mb-2">
                                <span className="text-xs font-bold uppercase text-slate-500 mr-2">Rating</span>
                                <span className="text-sm font-medium">{review.rating ? `${review.rating}/10` : "N/A"}</span>
                            </div>
                            <p className="text-sm text-slate-700 mt-2 p-3 bg-slate-50 rounded border-l-4 border-l-indigo-500">
                                "{review.feedback}"
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 justify-center">
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAction(review.id, "APPROVED")}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(review.id, "REJECTED")}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
