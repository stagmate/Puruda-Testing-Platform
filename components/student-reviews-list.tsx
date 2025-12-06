"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, MessageSquare } from "lucide-react"

export function StudentReviewsList() {
    const [reviews, setReviews] = useState<any[]>([])

    useEffect(() => {
        // As a student, this returns only approved reviews for themselves
        fetch("/api/reviews")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setReviews(data)
            })
            .catch(console.error)
    }, [])

    if (reviews.length === 0) return null

    return (
        <Card className="h-full border-t-4 border-t-yellow-500 shadow-sm">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-yellow-600" />
                    Teacher Feedback
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="p-4 bg-slate-50 rounded border">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-semibold text-sm">{review.teacher.name}</h4>
                                    <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                                </div>
                                {review.rating && (
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border shadow-sm">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                                        <span className="text-sm font-bold">{review.rating}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed italic">
                                "{review.feedback}"
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
