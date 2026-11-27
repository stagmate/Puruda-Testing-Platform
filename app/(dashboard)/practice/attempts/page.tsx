"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { AttemptList, type AttemptRow as Attempt } from "@/components/pyq/attempt-list"

export default function PracticeAttemptsPage() {
    const [attempts, setAttempts] = useState<Attempt[] | null>(null)
    useEffect(() => {
        fetch("/api/practice/attempts").then(r => (r.ok ? r.json() : [])).then(setAttempts).catch(() => setAttempts([]))
    }, [])
    return (
        <div className="w-full space-y-4 p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My attempts</h1>
            {attempts === null ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                : attempts.length === 0 ? <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No attempts yet. <Link href="/practice" className="font-medium text-indigo-600 hover:underline">Start practising</Link></p>
                    : <AttemptList attempts={attempts} />}
        </div>
    )
}
