"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { QuestionEditor, draftError } from "./question-editor"
import type { QuestionDraft } from "@/lib/question-input"

/** Dialog around the question editor. onSave returns an error message, or null on success. */
export function EditorDialog({ open, title, description, initial, onClose, onSave, saveLabel = "Save" }: {
    open: boolean
    title: string
    description?: string
    initial: QuestionDraft | null
    onClose: () => void
    onSave: (draft: QuestionDraft) => Promise<string | null> | string | null
    saveLabel?: string
}) {
    const [draft, setDraft] = useState<QuestionDraft | null>(initial)
    const [showErrors, setShowErrors] = useState(false)
    const [saving, setSaving] = useState(false)
    const [serverError, setServerError] = useState("")

    // Reset local state whenever a different question is opened.
    const [lastInitial, setLastInitial] = useState(initial)
    if (initial !== lastInitial) {
        setLastInitial(initial)
        setDraft(initial)
        setShowErrors(false)
        setServerError("")
    }

    const save = async () => {
        if (!draft) return
        setShowErrors(true)
        if (draftError(draft)) return
        setSaving(true)
        setServerError("")
        const err = await onSave(draft)
        setSaving(false)
        if (err) setServerError(err)
    }

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {draft && <QuestionEditor value={draft} onChange={setDraft} showErrors={showErrors} />}
                {serverError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{serverError}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saveLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
