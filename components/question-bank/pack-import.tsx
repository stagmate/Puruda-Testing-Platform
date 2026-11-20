"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, PackageOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { readPack, toQuestionInput, type PackQuestion } from "@/lib/question-pack"

type Named = { id: string; name: string }
type BatchRow = Named & { courseId: string }
type PurgeSummary = { questions: number; questionsInTests: number; tests: { id: string; title: string; results: number }[] }

const NONE = "none"
const TYPE_LABEL: Record<string, string> = { SINGLE: "single", MULTIPLE: "multiple", INTEGER: "numeric" }
const UPLOADS_AT_ONCE = 4

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return (await fetch(dataUrl)).blob()
}

export function PackImport({ courses, batches, subjects, defaultCourseId, defaultBatchId, onSaved, onSubjectsChanged }: {
    courses: Named[]
    batches: BatchRow[]
    subjects: Named[]
    defaultCourseId: string
    defaultBatchId: string
    onSaved: () => void
    onSubjectsChanged: () => Promise<unknown>
}) {
    const input = useRef<HTMLInputElement>(null)
    const [pack, setPack] = useState<{ name: string; title: string; questions: PackQuestion[]; problems: string[] } | null>(null)
    const [courseId, setCourseId] = useState(defaultCourseId)
    const [batchId, setBatchId] = useState(defaultBatchId)
    const [busy, setBusy] = useState(false)
    const [progress, setProgress] = useState("")
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
    // Images already uploaded for this file, so a retry after a failed save doesn't upload them again.
    const uploaded = useRef<Map<number, string>>(new Map())

    const [summary, setSummary] = useState<PurgeSummary | null>(null)
    const loadSummary = useCallback(async () => {
        const res = await fetch("/api/admin/questions/purge").catch(() => null)
        // Only admins may empty the bank; teachers just don't see that section.
        setSummary(res?.ok ? await res.json() : null)
    }, [])
    useEffect(() => { loadSummary() }, [loadSummary])

    const visibleBatches = batches.filter(b => !courseId || b.courseId === courseId)

    const choose = async (file: File | undefined) => {
        setMessage(null)
        uploaded.current = new Map()
        if (!file) return setPack(null)
        try {
            const parsed = readPack(JSON.parse(await file.text()))
            setPack({ name: file.name, ...parsed })
        } catch {
            setPack({ name: file.name, title: "", questions: [], problems: ["The file isn't valid JSON."] })
        }
    }

    // Paper → subject → counts, for the preview
    const breakdown = useMemo(() => {
        const rows = new Map<string, { paper: string; subject: string; counts: Record<string, number>; total: number }>()
        for (const q of pack?.questions ?? []) {
            const key = `${q.paper}\u0000${q.subject}`
            const row = rows.get(key) ?? { paper: q.paper || "—", subject: q.subject, counts: {}, total: 0 }
            row.counts[q.type] = (row.counts[q.type] ?? 0) + 1
            row.total++
            rows.set(key, row)
        }
        return Array.from(rows.values())
    }, [pack])

    const subjectNames = useMemo(() => Array.from(new Set((pack?.questions ?? []).map(q => q.subject))), [pack])
    const missingSubjects = subjectNames.filter(n => !subjects.some(s => sameName(s.name, n)))

    const importPack = async () => {
        if (!pack || pack.questions.length === 0 || pack.problems.length > 0) return
        setBusy(true)
        setMessage(null)
        try {
            // 1. Subjects, matched by name; missing ones are created.
            const subjectIds = new Map<string, string>()
            for (const name of subjectNames) {
                let subject = subjects.find(s => sameName(s.name, name))
                if (!subject) {
                    setProgress(`Creating subject ${name}…`)
                    const res = await fetch("/api/admin/subjects", {
                        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
                    })
                    if (!res.ok) throw new Error(`Couldn't create the subject ${name}: ${await res.text()}`)
                    subject = await res.json() as Named
                }
                subjectIds.set(name, subject.id)
            }
            if (missingSubjects.length) await onSubjectsChanged()

            // 2. Images, a few at a time.
            const todo = pack.questions.map((q, i) => i).filter(i => pack.questions[i].image && !uploaded.current.has(i))
            let done = pack.questions.filter(q => q.image).length - todo.length
            const total = done + todo.length
            setProgress(`Uploading images ${done}/${total}…`)
            const worker = async () => {
                for (let next = todo.shift(); next !== undefined; next = todo.shift()) {
                    const form = new FormData()
                    form.append("file", await dataUrlToBlob(pack.questions[next].image), `question-${next + 1}.png`)
                    const res = await fetch("/api/upload", { method: "POST", body: form })
                    if (!res.ok) throw new Error(`Image for question ${next + 1} failed to upload: ${await res.text()}`)
                    uploaded.current.set(next, (await res.json()).url)
                    setProgress(`Uploading images ${++done}/${total}…`)
                }
            }
            await Promise.all(Array.from({ length: UPLOADS_AT_ONCE }, worker))

            // 3. Save all questions in one all-or-nothing request.
            setProgress("Saving questions…")
            const questions = pack.questions.map((q, i) =>
                toQuestionInput(q, uploaded.current.get(i) ?? null, subjectIds.get(q.subject)))
            const res = await fetch("/api/admin/questions/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions, context: { courseId: courseId || null, batchId: batchId || null } }),
            })
            if (!res.ok) throw new Error(await res.text())
            const { count } = await res.json()

            const where = [courses.find(c => c.id === courseId)?.name, batches.find(b => b.id === batchId)?.name].filter(Boolean).join(" › ")
            setMessage({ ok: true, text: `Imported ${count} questions${where ? ` into ${where}` : ""}.` })
            setPack(null)
            uploaded.current = new Map()
            if (input.current) input.current.value = ""
            onSaved()
            loadSummary()
        } catch (e) {
            setMessage({ ok: false, text: e instanceof Error ? e.message : "Import failed" })
        } finally {
            setBusy(false)
            setProgress("")
        }
    }

    return (
        <div className="space-y-5">
            {summary && <ReplaceBank summary={summary} onRemoved={() => { loadSummary(); onSaved() }} />}

            <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
                <div>
                    <h3 className="flex items-center gap-2 font-medium"><PackageOpen className="h-4 w-4" />Import a question pack</h3>
                    <p className="text-sm text-slate-600">
                        A pack (.json) holds complete papers: each question as an image with its subject, type and answer key.
                        Subjects are matched by name and created if they don&apos;t exist yet.
                    </p>
                </div>

                <Input ref={input} type="file" accept=".json,application/json" onChange={e => choose(e.target.files?.[0])} disabled={busy} className="bg-white" />

                {pack && (
                    <div className="space-y-3">
                        {pack.title && <p className="text-sm font-medium">{pack.title}</p>}
                        {breakdown.length > 0 && (
                            <div className="overflow-x-auto rounded-md border bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 text-left text-xs text-slate-600">
                                        <tr><th className="px-3 py-2">Paper</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Questions</th></tr>
                                    </thead>
                                    <tbody>
                                        {breakdown.map(r => (
                                            <tr key={`${r.paper}-${r.subject}`} className="border-t">
                                                <td className="px-3 py-2">{r.paper}</td>
                                                <td className="px-3 py-2">
                                                    {r.subject}
                                                    {missingSubjects.some(n => sameName(n, r.subject)) && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-semibold uppercase text-amber-800">new</span>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    <span className="font-semibold">{r.total}</span>
                                                    <span className="text-slate-500"> ({Object.entries(r.counts).map(([t, n]) => `${n} ${TYPE_LABEL[t] ?? t.toLowerCase()}`).join(", ")})</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {pack.problems.length > 0 && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                <p className="font-medium">This pack can&apos;t be imported:</p>
                                <ul className="mt-1 list-disc pl-5">
                                    {pack.problems.slice(0, 10).map(p => <li key={p}>{p}</li>)}
                                    {pack.problems.length > 10 && <li>…and {pack.problems.length - 10} more</li>}
                                </ul>
                            </div>
                        )}

                        {pack.problems.length === 0 && (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Course</Label>
                                        <Select value={courseId || NONE} onValueChange={v => { setCourseId(v === NONE ? "" : v); setBatchId("") }} disabled={busy}>
                                            <SelectTrigger className="bg-white" aria-label="Import into course"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NONE}>No course</SelectItem>
                                                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Batch</Label>
                                        <Select value={batchId || NONE} onValueChange={v => setBatchId(v === NONE ? "" : v)} disabled={busy}>
                                            <SelectTrigger className="bg-white" aria-label="Import into batch"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NONE}>No batch</SelectItem>
                                                {visibleBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {summary && summary.questions > 0 && (
                                    <p className="flex items-start gap-2 text-sm text-amber-800">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        The bank already has {summary.questions} question{summary.questions === 1 ? "" : "s"}. They&apos;ll stay; remove them above first if this pack should replace them.
                                    </p>
                                )}
                                <Button onClick={importPack} disabled={busy} className="w-full sm:w-auto">
                                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {busy ? progress || "Importing…" : `Import ${pack.questions.length} questions`}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {message && (
                    <p className={`flex items-start gap-2 whitespace-pre-line text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>
                        {message.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                        {message.text}
                    </p>
                )}
            </div>
        </div>
    )
}

/** Admin-only: empty the question bank, optionally with the tests that use its questions. */
function ReplaceBank({ summary, onRemoved }: { summary: PurgeSummary; onRemoved: () => void }) {
    const [open, setOpen] = useState(false)
    const [deleteTests, setDeleteTests] = useState(false)
    const [confirm, setConfirm] = useState("")
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    const results = summary.tests.reduce((n, t) => n + t.results, 0)
    const removable = deleteTests ? summary.questions : summary.questions - summary.questionsInTests

    const remove = async () => {
        setBusy(true)
        const res = await fetch("/api/admin/questions/purge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm, deleteTests }),
        }).catch(() => null)
        setBusy(false)
        if (!res?.ok) return setMessage({ ok: false, text: (await res?.text()) || "Couldn't remove the questions" })
        const r = await res.json()
        const parts = [`Removed ${r.questionsDeleted} question${r.questionsDeleted === 1 ? "" : "s"}`]
        if (r.testsDeleted) parts.push(`${r.testsDeleted} test${r.testsDeleted === 1 ? "" : "s"} and ${r.resultsDeleted} result${r.resultsDeleted === 1 ? "" : "s"}`)
        const kept = r.questions > 0 ? ` ${r.questions} question${r.questions === 1 ? " is" : "s are"} still used by tests and were kept.` : ""
        setMessage({ ok: true, text: `${parts.join(", ")}.${kept}` })
        setOpen(false)
        setConfirm("")
        setDeleteTests(false)
        onRemoved()
    }

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h3 className="font-medium">Replace the bank</h3>
                <p className="text-sm text-slate-600">
                    {summary.questions === 0 ? "The question bank is empty." : `The bank has ${summary.questions} question${summary.questions === 1 ? "" : "s"}${summary.questionsInTests ? `, ${summary.questionsInTests} used in ${summary.tests.length} test${summary.tests.length === 1 ? "" : "s"}` : ""}.`}
                </p>
                {message && <p className={`mt-1 text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
            </div>
            <Button variant="outline" className="shrink-0 border-red-300 text-red-700 hover:bg-red-100" disabled={summary.questions === 0} onClick={() => { setMessage(null); setOpen(true) }}>
                <Trash2 className="mr-2 h-4 w-4" />Remove all questions
            </Button>

            <Dialog open={open} onOpenChange={o => { if (!busy) setOpen(o) }}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Remove all questions?</DialogTitle>
                        <DialogDescription>This permanently deletes questions and their images. It can&apos;t be undone.</DialogDescription>
                    </DialogHeader>

                    {summary.questionsInTests > 0 && (
                        <div className="space-y-2 rounded-md border bg-slate-50 p-3 text-sm">
                            <p>
                                {summary.questionsInTests} question{summary.questionsInTests === 1 ? " is" : "s are"} used in {summary.tests.length} test{summary.tests.length === 1 ? "" : "s"}
                                {results > 0 ? ` with ${results} student result${results === 1 ? "" : "s"}` : ""}:
                            </p>
                            <ul className="max-h-28 list-disc overflow-y-auto pl-5 text-slate-700">
                                {summary.tests.map(t => <li key={t.id}>{t.title}{t.results ? ` (${t.results} result${t.results === 1 ? "" : "s"})` : ""}</li>)}
                            </ul>
                            <label className="flex items-start gap-2 pt-1">
                                <Checkbox checked={deleteTests} onCheckedChange={v => setDeleteTests(v === true)} className="mt-0.5" />
                                <span>Also delete these tests and their results. Otherwise the questions they use are kept.</span>
                            </label>
                        </div>
                    )}

                    <p className="text-sm">
                        <span className="font-semibold">{removable}</span> question{removable === 1 ? "" : "s"} will be removed
                        {deleteTests && summary.tests.length > 0 ? <>, plus <span className="font-semibold">{summary.tests.length}</span> test{summary.tests.length === 1 ? "" : "s"} and <span className="font-semibold">{results}</span> result{results === 1 ? "" : "s"}</> : ""}.
                    </p>
                    <div className="space-y-1">
                        <Label htmlFor="purge-confirm" className="text-sm">Type DELETE to confirm</Label>
                        <Input id="purge-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" />
                    </div>
                    {message && !message.ok && <p className="text-sm text-red-600">{message.text}</p>}
                    <Button variant="destructive" onClick={remove} disabled={busy || confirm !== "DELETE" || removable === 0}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Remove {removable} question{removable === 1 ? "" : "s"}
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
