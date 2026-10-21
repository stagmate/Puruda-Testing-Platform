"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestionEditor, draftError } from "./question-editor"
import { emptyDraft, type QuestionDraft } from "@/lib/question-input"
import type { QuestionContext } from "@/lib/question-context"

export function AddQuestion({ context, contextLabel, onSaved }: { context: QuestionContext; contextLabel: string; onSaved: () => void }) {
    const [draft, setDraft] = useState<QuestionDraft>(emptyDraft())
    const [showErrors, setShowErrors] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    const save = async () => {
        setShowErrors(true)
        setMessage(null)
        if (!context.subjectId) return setMessage({ ok: false, text: "Choose a subject at the top first." })
        if (draftError(draft)) return
        setSaving(true)
        const res = await fetch("/api/admin/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...draft, ...context }),
        })
        setSaving(false)
        if (!res.ok) return setMessage({ ok: false, text: await res.text() })
        // Keep type and difficulty for the next question; clear the rest.
        setDraft({ ...emptyDraft(draft.type), difficulty: draft.difficulty })
        setShowErrors(false)
        setMessage({ ok: true, text: `Question added to ${contextLabel}.` })
        onSaved()
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">Saved to: <span className="font-medium text-slate-700">{contextLabel}</span> (change with the filters above)</p>
            <QuestionEditor value={draft} onChange={setDraft} showErrors={showErrors} />
            {message && (
                <p className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
                    {message.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}{message.text}
                </p>
            )}
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add question
            </Button>
        </div>
    )
}
