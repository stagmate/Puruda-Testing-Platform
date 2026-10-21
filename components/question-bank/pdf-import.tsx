"use client"

import { useMemo, useRef, useState } from "react"
import { FileUp, Loader2, AlertTriangle, Pencil, Trash2, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuestionView } from "./question-view"
import { EditorDialog } from "./editor-dialog"
import { draftError } from "./question-editor"
import { renderPdf, extractQuestions, attachFigures, type PageImage, type ImportProgress } from "@/lib/pdf-import/browser"
import type { ImportedQuestion } from "@/lib/pdf-import/merge"
import type { QuestionContext } from "@/lib/question-context"
import type { QuestionDraft } from "@/lib/question-input"
import { cn } from "@/lib/utils"

type Item = ImportedQuestion & { include: boolean }

const STAGE_LABEL = { render: "Reading pages", read: "Finding questions with AI", figures: "Cropping diagrams" } as const

export function PdfImport({ context, contextLabel, onSaved }: {
    context: QuestionContext
    contextLabel: string
    onSaved: () => void
}) {
    const fileInput = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [progress, setProgress] = useState<ImportProgress | null>(null)
    const [error, setError] = useState("")
    const [pages, setPages] = useState<PageImage[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [onlyIssues, setOnlyIssues] = useState(false)
    const [editing, setEditing] = useState<number | null>(null)
    const [viewPage, setViewPage] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState("")
    const abort = useRef<AbortController | null>(null)

    const busy = progress !== null

    const run = async () => {
        if (!file) return
        setError(""); setSaved(""); setItems([])
        const ctl = new AbortController()
        abort.current = ctl
        try {
            const rendered = await renderPdf(file, setProgress, ctl.signal)
            setPages(rendered)
            const questions = await extractQuestions(rendered, setProgress, ctl.signal)
            if (questions.length === 0) throw new Error("No questions were found in this PDF.")
            await attachFigures(questions, rendered, setProgress)
            setItems(questions.map(q => ({ ...q, include: true })))
        } catch (e) {
            if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : "Import failed")
        } finally {
            setProgress(null)
            abort.current = null
        }
    }

    const issues = (it: Item) => {
        const err = draftError(it.draft)
        return err ? [err, ...it.warnings.filter(w => !/No (numeric )?answer/.test(w))] : it.warnings
    }
    const withIssues = items.filter(it => issues(it).length > 0).length
    const selected = items.filter(it => it.include)
    const selectedInvalid = selected.filter(it => draftError(it.draft))
    const shown = useMemo(() => items.map((it, i) => ({ it, i })).filter(({ it }) => !onlyIssues || issues(it).length > 0), [items, onlyIssues])

    const update = (i: number, patch: Partial<Item>) => setItems(prev => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)))

    const saveEdit = (draft: QuestionDraft) => {
        if (editing === null) return null
        // Edited by a person: clear the AI warnings that the edit resolves.
        update(editing, { draft, warnings: items[editing].warnings.filter(w => /appears more than once|only A–D/.test(w)) })
        setEditing(null)
        return null
    }

    const save = async () => {
        if (!context.subjectId) return setError("Choose a subject at the top before saving.")
        if (selectedInvalid.length) return setError(`${selectedInvalid.length} selected question(s) still need fixing (marked in red).`)
        setSaving(true); setError("")
        const res = await fetch("/api/admin/questions/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context, questions: selected.map(it => it.draft) }),
        })
        setSaving(false)
        if (!res.ok) return setError(await res.text())
        const { count } = await res.json()
        setSaved(`Saved ${count} question${count === 1 ? "" : "s"} to ${contextLabel}.`)
        setItems([]); setPages([]); setFile(null)
        if (fileInput.current) fileInput.current.value = ""
        onSaved()
    }

    const page = viewPage !== null ? pages.find(p => p.page === viewPage) : null

    return (
        <div className="space-y-4">
            {/* Step 1: choose file */}
            <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
                <div>
                    <h3 className="font-medium">Import questions from a PDF</h3>
                    <p className="text-sm text-slate-600">
                        AI reads each page, finds the questions, options, answers (including an answer key at the end) and solutions,
                        and cuts out diagrams. You review everything before it&apos;s saved.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setSaved("") }} />
                    <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy} className="justify-start">
                        <FileText className="mr-2 h-4 w-4" /><span className="truncate">{file ? file.name : "Choose PDF…"}</span>
                    </Button>
                    {busy ? (
                        <Button variant="outline" onClick={() => abort.current?.abort()}>Cancel</Button>
                    ) : (
                        <Button onClick={run} disabled={!file}><FileUp className="mr-2 h-4 w-4" />Read questions</Button>
                    )}
                </div>

                {progress && (
                    <div className="space-y-1" aria-live="polite">
                        <div className="flex justify-between text-xs text-slate-600">
                            <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />{STAGE_LABEL[progress.stage]}</span>
                            <span className="tabular-nums">{progress.done} / {progress.total}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                        </div>
                    </div>
                )}
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                {saved && <p className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{saved}</p>}
            </div>

            {/* Step 2: review */}
            {items.length > 0 && (
                <div className="space-y-3">
                    <div className="sticky top-14 z-10 -mx-1 flex flex-col gap-2 rounded-lg border bg-white/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between md:top-2">
                        <div className="text-sm">
                            <span className="font-medium">{items.length} questions found</span>
                            {withIssues > 0 && <span className="text-amber-700"> · {withIssues} need a look</span>}
                            <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                                <input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} />
                                Show only questions that need a look
                            </label>
                        </div>
                        <Button onClick={save} disabled={saving || selected.length === 0}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save {selected.length} to {contextLabel}
                        </Button>
                    </div>

                    <ul className="space-y-3">
                        {shown.map(({ it, i }) => {
                            const problems = issues(it)
                            const invalid = !!draftError(it.draft)
                            return (
                                <li key={it.key} className={cn("rounded-lg border bg-white p-3 sm:p-4", !it.include && "opacity-50", invalid && it.include && "border-red-300")}>
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            <input type="checkbox" checked={it.include} onChange={e => update(i, { include: e.target.checked })} />
                                            Q{it.number || i + 1}
                                            <button type="button" onClick={() => setViewPage(it.page)} className="text-xs font-normal text-indigo-600 hover:underline">page {it.page}</button>
                                            {it.section && <span className="hidden text-xs font-normal text-slate-500 sm:inline">· {it.section}</span>}
                                        </label>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setEditing(i)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} aria-label="Remove from import">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    {problems.length > 0 && (
                                        <ul className="mb-3 space-y-1">
                                            {problems.map(p => (
                                                <li key={p} className={cn("flex items-start gap-1.5 rounded px-2 py-1 text-xs", invalid ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>
                                                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />{p}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <QuestionView draft={it.draft} />
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}

            <EditorDialog
                open={editing !== null}
                title={editing !== null ? `Edit Q${items[editing]?.number || editing + 1}` : ""}
                description={editing !== null ? `From page ${items[editing]?.page}` : undefined}
                initial={editing !== null ? items[editing]?.draft ?? null : null}
                onClose={() => setEditing(null)}
                onSave={saveEdit}
                saveLabel="Done"
            />

            <Dialog open={!!page} onOpenChange={o => !o && setViewPage(null)}>
                <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-3 sm:p-6">
                    <DialogHeader><DialogTitle>Page {viewPage}</DialogTitle></DialogHeader>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {page && <img src={page.dataUrl} alt={`Page ${viewPage} of the PDF`} className="w-full rounded border" />}
                </DialogContent>
            </Dialog>
        </div>
    )
}
