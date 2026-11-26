"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ResultReview } from "@/components/result-review"

// One submitted test: score summary, then every question with the student's
// answer, the correct answer and the solution.
export default function StudentTestReviewPage({ params }: { params: Promise<{ testId: string }> }) {
    const { testId } = use(params)
    return (
        <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:px-6 sm:py-6">
            <Link href="/student/results" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
                <ArrowLeft className="h-4 w-4" />Back to Results &amp; Reports
            </Link>
            <ResultReview testId={testId} />
        </div>
    )
}
