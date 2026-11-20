"use client"

import { useState } from "react"
import { CalendarClock, Eye, EyeOff, Loader2, Printer, Settings2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MARKING_PRESETS, describeScheme, parseScheme, presetOf, type MarkingScheme } from "@/lib/marking"
import { cn } from "@/lib/utils"

export type ManagedTest = {
    id: string
    title: string
    duration: number
    isPublished: boolean
    startTime: string | null
    endTime: string | null
    markingScheme: string | null
    course?: { name: string } | null
    batches: { name: string }[]
    _count: { questions: number; results?: number }
}

const CUSTOM = "CUSTOM"

/** ISO time → value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

export function testStatus(t: Pick<ManagedTest, "isPublished" | "startTime" | "endTime">, now = Date.now()) {
    if (!t.isPublished) return { label: "Draft", detail: "Hidden from students", style: "bg-slate-200 text-slate-700" }
    if (t.startTime && new Date(t.startTime).getTime() > now) return { label: "Scheduled", detail: `Opens ${when(t.startTime)}`, style: "bg-blue-100 text-blue-800" }
    if (t.endTime && new Date(t.endTime).getTime() < now) return { label: "Closed", detail: `Closed ${when(t.endTime)}`, style: "bg-amber-100 text-amber-800" }
    return { label: "Live", detail: t.endTime ? `Open until ${when(t.endTime)}` : "Open to students", style: "bg-green-100 text-green-800" }
}

/** Pick a preset or set marks per question type. */
export function MarkingFields({ value, onChange, disabled }: { value: MarkingScheme; onChange: (s: MarkingScheme) => void; disabled?: boolean }) {
    const preset = presetOf(value) ?? CUSTOM
    const num = (v: string) => (v === "" || v === "-" ? 0 : parseInt(v, 10) || 0)
    const row = (label: string, key: "single" | "multiple" | "numeric") => (
        <div className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2">
            <span className="text-sm text-slate-700">{label}</span>
            <Input type="number" aria-label={`${label}: marks if correct`} value={value[key].correct} disabled={disabled} min={1}
                onChange={e => onChange({ ...value, [key]: { ...value[key], correct: Math.max(1, num(e.target.value)) } })} className="h-8 bg-white" />
            <Input type="number" aria-label={`${label}: marks if wrong`} value={value[key].wrong} disabled={disabled} max={0}
                onChange={e => onChange({ ...value, [key]: { ...value[key], wrong: Math.min(0, num(e.target.value)) } })} className="h-8 bg-white" />
        </div>
    )
    return (
        <div className="space-y-2">
            <Select value={preset} onValueChange={v => { if (v !== CUSTOM) onChange(structuredClone(MARKING_PRESETS[v as keyof typeof MARKING_PRESETS].scheme)) }} disabled={disabled}>
                <SelectTrigger className="bg-white" aria-label="Marking scheme"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {Object.entries(MARKING_PRESETS).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
                    <SelectItem value={CUSTOM}>Custom</SelectItem>
                </SelectContent>
            </Select>
            <div className="space-y-1.5 rounded-md border bg-slate-50 p-2.5">
                <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 text-[11px] font-medium uppercase text-slate-500">
                    <span>Question type</span><span>Correct</span><span>Wrong</span>
                </div>
                {row("Single correct", "single")}
                {row("Multiple correct", "multiple")}
                {row("Numeric", "numeric")}
                <label className="flex items-start gap-2 pt-1 text-sm text-slate-700">
                    <Checkbox checked={value.multiple.partial} disabled={disabled} className="mt-0.5"
                        onCheckedChange={c => onChange({ ...value, multiple: { ...value.multiple, partial: c === true } })} />
                    <span>Partial marks for multiple correct: +1 for each correct option chosen when no wrong option is chosen</span>
                </label>
                <p className="text-xs text-slate-500">Unanswered questions score 0.</p>
            </div>
        </div>
    )
}

/** List of tests with their status, and the actions to publish, schedule, mark and delete them. */
export function TestList({ tests, onChanged, canDelete }: { tests: ManagedTest[]; onChanged: () => void; canDelete: boolean }) {
    const [busyId, setBusyId] = useState<string | null>(null)
    const [error, setError] = useState("")
    const [editing, setEditing] = useState<ManagedTest | null>(null)
    const [deleting, setDeleting] = useState<ManagedTest | null>(null)

    const patch = async (t: ManagedTest, body: Record<string, unknown>) => {
        setBusyId(t.id)
        setError("")
        const res = await fetch(`/api/admin/tests/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null)
        setBusyId(null)
        if (!res?.ok) { setError((await res?.text()) || "Couldn't update the test"); return false }
        onChanged()
        return true
    }

    if (tests.length === 0) return <p className="rounded-lg border border-dashed py-8 text-center text-sm text-slate-500">No tests yet.</p>

    return (
        <div className="space-y-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {tests.map(t => {
                const status = testStatus(t)
                const results = t._count.results ?? 0
                return (
                    <div key={t.id} className="rounded-lg border p-3 hover:bg-slate-50">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-medium">{t.title}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {[t.course?.name, t.batches.map(b => b.name).join(", ") || "All students", `${t._count.questions} Qs`, `${t.duration} min`, results ? `${results} result${results === 1 ? "" : "s"}` : null].filter(Boolean).join(" • ")}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Marking: {describeScheme(parseScheme(t.markingScheme))}</p>
                            </div>
                            <span className={cn("shrink-0 rounded px-2 py-0.5 text-xs font-semibold", status.style)} title={status.detail}>{status.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{status.detail}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
                            <Button variant={t.isPublished ? "outline" : "default"} size="sm" disabled={busyId === t.id} onClick={() => patch(t, { isPublished: !t.isPublished })}>
                                {busyId === t.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : t.isPublished ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
                                {t.isPublished ? "Unpublish" : "Publish"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Settings2 className="mr-1.5 h-4 w-4" />Schedule & marking</Button>
                            <div className="relative">
                                <select
                                    aria-label="Print"
                                    className="h-8 w-[92px] cursor-pointer appearance-none rounded-md border border-input bg-transparent px-2 text-sm"
                                    onChange={e => { if (e.target.value) window.open(`/print/test/${t.id}?mode=${e.target.value}`, "_blank"); e.target.value = "" }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Print…</option>
                                    <option value="student">Student Paper</option>
                                    <option value="teacher">Teacher Copy</option>
                                    <option value="key">Answer Key</option>
                                </select>
                                <Printer className="pointer-events-none absolute right-2 top-2 h-4 w-4 opacity-50" />
                            </div>
                            {canDelete && (
                                <Button variant="ghost" size="sm" className="text-red-600" aria-label={`Delete ${t.title}`} onClick={() => setDeleting(t)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                )
            })}

            {editing && <TestSettingsDialog test={editing} onClose={() => setEditing(null)} onSave={body => patch(editing, body)} />}
            {deleting && <DeleteTestDialog test={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); onChanged() }} />}
        </div>
    )
}

function TestSettingsDialog({ test, onClose, onSave }: { test: ManagedTest; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
    const [published, setPublished] = useState(test.isPublished)
    const [start, setStart] = useState(toLocalInput(test.startTime))
    const [end, setEnd] = useState(toLocalInput(test.endTime))
    const original = parseScheme(test.markingScheme)
    const [scheme, setScheme] = useState<MarkingScheme>(original)
    const [saving, setSaving] = useState(false)
    const results = test._count.results ?? 0
    const markingChanged = JSON.stringify(scheme) !== JSON.stringify(original)

    const save = async () => {
        setSaving(true)
        const ok = await onSave({
            isPublished: published,
            startTime: fromLocalInput(start),
            endTime: fromLocalInput(end),
            ...(markingChanged ? { marking: scheme } : {}),
        })
        setSaving(false)
        if (ok) onClose()
    }

    return (
        <Dialog open onOpenChange={o => { if (!o && !saving) onClose() }}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />{test.title}</DialogTitle>
                    <DialogDescription>Students see a test only when it is published, and can start it between the open and close times.</DialogDescription>
                </DialogHeader>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox checked={published} onCheckedChange={c => setPublished(c === true)} />
                    Published (visible to students)
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <Label htmlFor="opens">Opens (optional)</Label>
                        <Input id="opens" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="closes">Closes (optional)</Label>
                        <Input id="closes" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label>Marking</Label>
                    <MarkingFields value={scheme} onChange={setScheme} disabled={saving} />
                    {markingChanged && results > 0 && (
                        <p className="text-sm text-amber-800">The {results} result{results === 1 ? "" : "s"} already submitted will be re-scored with the new marking.</p>
                    )}
                </div>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
            </DialogContent>
        </Dialog>
    )
}

function DeleteTestDialog({ test, onClose, onDeleted }: { test: ManagedTest; onClose: () => void; onDeleted: () => void }) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const results = test._count.results ?? 0

    const remove = async () => {
        setBusy(true)
        const res = await fetch(`/api/admin/tests/${test.id}`, { method: "DELETE" }).catch(() => null)
        setBusy(false)
        if (!res?.ok) return setError((await res?.text()) || "Couldn't delete the test")
        onDeleted()
    }

    return (
        <Dialog open onOpenChange={o => { if (!o && !busy) onClose() }}>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete {test.title}?</DialogTitle>
                    <DialogDescription>
                        {results > 0
                            ? `This also deletes ${results} student result${results === 1 ? "" : "s"}. It can't be undone.`
                            : "No student has submitted it yet. The questions stay in the question bank."}
                    </DialogDescription>
                </DialogHeader>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button variant="destructive" onClick={remove} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete test</Button>
            </DialogContent>
        </Dialog>
    )
}
