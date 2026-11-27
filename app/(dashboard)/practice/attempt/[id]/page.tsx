"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PracticeRunner, type OpenAttempt } from "@/components/pyq/practice-runner"
import { PracticeResult, type FinishedAttempt } from "@/components/pyq/practice-result"

type Data = ({ submitted: false } & OpenAttempt) | ({ submitted: true } & FinishedAttempt)

// Solve a PYQ set; once submitted, the same page shows the result and solutions.
export default function PracticeAttemptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<Data | null>(null)
    const [error, setError] = useState("")
    const [retrying, setRetrying] = useState(false)

    const fetchAttempt = useCallback(() => fetch(`/api/practice/attempts/${id}`).then(async r => {
        if (!r.ok) throw new Error(await r.text())
        return r.json() as Promise<Data>
    }), [id])
    const apply = useCallback((d: Data) => { setData(d); window.scrollTo({ top: 0 }) }, [])
    const fail = useCallback((e: unknown) => setError(e instanceof Error && e.message ? e.message : "Couldn't load this attempt"), [])

    useEffect(() => { fetchAttempt().then(apply).catch(fail) }, [fetchAttempt, apply, fail])

    if (error) return <p className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
    if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
    if (!data.submitted) return <PracticeRunner attempt={data} onFinished={() => fetchAttempt().then(apply).catch(fail)} />

    // Papers can be attempted again directly; chapter sets are rebuilt from the practice page.
    const retry = data.kind === "PAPER" ? async () => {
        setRetrying(true)
        const res = await fetch(`/api/practice/attempts/${id}/retry`, { method: "POST" }).catch(() => null)
        if (!res?.ok) { setRetrying(false); return }
        router.push(`/practice/attempt/${(await res.json()).id}`)
    } : undefined
    return <PracticeResult attempt={data} onRetry={retry} retrying={retrying} />
}
