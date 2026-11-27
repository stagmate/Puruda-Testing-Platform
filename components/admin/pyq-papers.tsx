"use client"

import { useCallback, useEffect, useState } from "react"
import { FileStack, Plus, Pencil, Trash2, Eye, EyeOff, FileSearch, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Badge, ConfirmDialog, DataTable, EmptyState, Field, FormDialog, LoadingRow, Panel, PanelHeader, SearchInput, getJson, plural, readError, send,
} from "@/components/admin/kit"
import { TestPreviewDialog } from "@/components/tests/test-preview-dialog"
import type { StoredQuestion } from "@/components/question-bank/question-form-dialog"
import { MARKING_PRESETS, parseScheme, presetOf } from "@/lib/marking"

type Paper = {
    id: string; exam: string; year: number; session: string; title: string; duration: number; markingScheme: string | null
    isPublished: boolean; _count: { questions: number; attempts: number }; subjects: { subject: string; count: number }[]
}
type Tag = { tag: string; questions: number; inPapers: number }
const NO_TAG = "__none"

/** Previous-year papers offered free to learners who sign up with their phone. */
export function PyqPapers() {
    const [papers, setPapers] = useState<Paper[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [editing, setEditing] = useState<Paper | "new" | null>(null)
    const [deleting, setDeleting] = useState<Paper | null>(null)
    const [previewing, setPreviewing] = useState<Paper | null>(null)
    const [error, setError] = useState("")

    const fetchAll = useCallback(() => Promise.all([getJson<Paper[]>("/api/admin/pyq-papers", []), getJson<Tag[]>("/api/admin/pyq-papers/tags", [])]), [])
    const apply = useCallback(([p, t]: [Paper[], Tag[]]) => { setPapers(p); setTags(t); setLoading(false) }, [])
    const reload = useCallback(() => fetchAll().then(apply), [fetchAll, apply])
    useEffect(() => { fetchAll().then(apply) }, [fetchAll, apply])

    const togglePublish = async (p: Paper) => {
        setError("")
        const res = await send(`/api/admin/pyq-papers/${p.id}`, "PATCH", { isPublished: !p.isPublished })
        if (!res?.ok) return setError(await readError(res))
        reload()
    }

    const q = search.trim().toLowerCase()
    const rows = papers.filter(p => !q || `${p.title} ${p.exam} ${p.year} ${p.session}`.toLowerCase().includes(q))
    const published = papers.filter(p => p.isPublished)

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-950">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <div className="space-y-1">
                    <p><b>How to add a paper:</b> import it in the Question Bank (PDF, CSV or pack) with an exam tag such as &ldquo;JEE Main 2025 22 Jan Shift 1&rdquo;, and file each question under its subject and chapter. Then create the paper here from that tag and publish it.</p>
                    <p>Published papers appear free at <b>/pyq</b> for anyone who signs up with their phone: as full papers, and chapter-wise by the chapters their questions are filed under.</p>
                </div>
            </div>

            <Panel>
                <PanelHeader
                    title="PYQ papers"
                    subtitle={`${plural(published.length, "published paper")} · ${published.reduce((n, p) => n + p._count.questions, 0)} questions live for learners`}
                    actions={<>
                        <SearchInput value={search} onChange={setSearch} placeholder="Search papers" className="w-full sm:w-64" />
                        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add paper</Button>
                    </>}
                />
                {error && <p className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 md:mx-5" role="alert">{error}</p>}
                {loading ? <LoadingRow /> : (
                    <DataTable
                        rows={rows}
                        rowKey={p => p.id}
                        empty={<EmptyState icon={FileStack} title={papers.length ? "No paper matches" : "No PYQ papers yet"} hint={papers.length ? undefined : "Import a past paper into the Question Bank, then add it here."} action={papers.length ? undefined : <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add paper</Button>} />}
                        columns={[
                            { header: "Paper", cell: p => <div><p className="font-semibold text-slate-900">{p.title}</p><p className="text-xs text-slate-500">{p.duration} min · {describe(p.markingScheme)}</p></div> },
                            {
                                header: "Questions", cell: p => (
                                    <div className="space-y-1">
                                        <span className="font-medium tabular-nums">{p._count.questions}</span>
                                        <div className="flex flex-wrap gap-1">{p.subjects.map(s => <Badge key={s.subject} tone="blue">{s.subject} {s.count}</Badge>)}</div>
                                    </div>
                                ),
                            },
                            { header: "Attempts", className: "w-24", cell: p => <span className="tabular-nums">{p._count.attempts}</span> },
                            { header: "Status", className: "w-28", cell: p => p.isPublished ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge> },
                            {
                                header: "Actions", className: "w-px text-right", cell: p => (
                                    <div className="flex justify-end gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setPreviewing(p)}><FileSearch className="h-3.5 w-3.5" />Preview</Button>
                                        <Button variant={p.isPublished ? "outline" : "default"} size="sm" onClick={() => togglePublish(p)}>
                                            {p.isPublished ? <><EyeOff className="h-3.5 w-3.5" />Unpublish</> : <><Eye className="h-3.5 w-3.5" />Publish</>}
                                        </Button>
                                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`} title="Edit"><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon-sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ),
                            },
                        ]}
                    />
                )}
            </Panel>

            <PaperDialog open={editing !== null} paper={editing === "new" ? null : editing} tags={tags} onClose={() => setEditing(null)} onSaved={reload} />
            <ConfirmDialog
                open={!!deleting}
                title={`Delete ${deleting?.title}?`}
                description={<p>Its {plural(deleting?._count.questions ?? 0, "question")} stay in the Question Bank. Learners&apos; past attempts keep their scores.</p>}
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/admin/pyq-papers/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
            {previewing && <PaperPreview paper={previewing} onClose={() => { setPreviewing(null); reload() }} />}
        </div>
    )
}

function describe(stored: string | null) {
    const preset = presetOf(parseScheme(stored))
    return preset ? MARKING_PRESETS[preset].label : "Custom marking"
}

function PaperDialog({ open, paper, tags, onClose, onSaved }: { open: boolean; paper: Paper | null; tags: Tag[]; onClose: () => void; onSaved: () => Promise<void> }) {
    const [form, setForm] = useState({ exam: "JEE Main", year: String(new Date().getFullYear()), session: "", title: "", duration: "180", marking: "JEE_MAIN", examTag: "" })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const key = open ? (paper?.id ?? "new") : null
    const [lastKey, setLastKey] = useState<string | null>(null)
    if (key !== lastKey) {
        setLastKey(key)
        setError("")
        setForm(paper
            ? { exam: paper.exam, year: String(paper.year), session: paper.session, title: paper.title, duration: String(paper.duration), marking: presetOf(parseScheme(paper.markingScheme)) ?? "JEE_MAIN", examTag: "" }
            : { exam: "JEE Main", year: String(new Date().getFullYear()), session: "", title: "", duration: "180", marking: "JEE_MAIN", examTag: "" })
    }
    const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

    const save = async () => {
        setBusy(true)
        setError("")
        const body = { exam: form.exam, year: Number(form.year), session: form.session, title: form.title, duration: Number(form.duration), marking: form.marking, examTag: form.examTag || undefined }
        const res = paper ? await send(`/api/admin/pyq-papers/${paper.id}`, "PATCH", body) : await send("/api/admin/pyq-papers", "POST", body)
        if (!res?.ok) { setBusy(false); return setError(await readError(res)) }
        await onSaved()
        setBusy(false)
        onClose()
    }

    return (
        <FormDialog open={open} wide title={paper ? "Edit paper" : "Add PYQ paper"} description="Learners see the exam, year and shift/session." onClose={onClose} onSubmit={save} busy={busy} error={error} submitLabel={paper ? "Save changes" : "Add paper"}>
            <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Exam" htmlFor="p-exam"><Input id="p-exam" value={form.exam} onChange={e => set("exam")(e.target.value)} placeholder="JEE Main" /></Field>
                <Field label="Year" htmlFor="p-year"><Input id="p-year" type="number" value={form.year} onChange={e => set("year")(e.target.value)} /></Field>
                <Field label="Shift / session" htmlFor="p-session"><Input id="p-session" value={form.session} onChange={e => set("session")(e.target.value)} placeholder="22 Jan, Shift 1" /></Field>
            </div>
            <Field label="Title (optional)" htmlFor="p-title" hint="Left blank, it's made from the exam, year and session.">
                <Input id="p-title" value={form.title} onChange={e => set("title")(e.target.value)} placeholder="JEE Main · 2025 · 22 Jan, Shift 1" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Test-mode duration (minutes)" htmlFor="p-duration"><Input id="p-duration" type="number" value={form.duration} onChange={e => set("duration")(e.target.value)} /></Field>
                <Field label="Marking">
                    <Select value={form.marking} onValueChange={set("marking")}>
                        <SelectTrigger className="w-full" aria-label="Marking"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(MARKING_PRESETS).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                </Field>
            </div>
            <Field label={paper ? "Add more questions by exam tag (optional)" : "Questions: exam tag from the Question Bank"} hint="Every question with this tag is filed under the paper, in the order it was imported.">
                <Select value={form.examTag || NO_TAG} onValueChange={v => set("examTag")(v === NO_TAG ? "" : v)}>
                    <SelectTrigger className="w-full" aria-label="Exam tag"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_TAG}>{paper ? "Don't add questions" : "Add questions later"}</SelectItem>
                        {tags.map(t => <SelectItem key={t.tag} value={t.tag}>{t.tag} · {t.questions} questions{t.inPapers ? ` (${t.inPapers} already in a paper)` : ""}</SelectItem>)}
                    </SelectContent>
                </Select>
            </Field>
        </FormDialog>
    )
}

function PaperPreview({ paper, onClose }: { paper: Paper; onClose: () => void }) {
    const [questions, setQuestions] = useState<StoredQuestion[] | null>(null)
    const fetchQs = useCallback(() => getJson<{ questions: StoredQuestion[] }>(`/api/admin/pyq-papers/${paper.id}`, { questions: [] }), [paper.id])
    useEffect(() => { fetchQs().then(d => setQuestions(d.questions)) }, [fetchQs])
    return (
        <TestPreviewDialog
            open
            onClose={onClose}
            loading={questions === null}
            summary={{ title: paper.title, duration: paper.duration, batches: ["Free learners"], opens: null, closes: null, marking: parseScheme(paper.markingScheme) }}
            questions={questions ?? []}
            onRemove={async id => {
                const res = await send(`/api/admin/pyq-papers/${paper.id}`, "PATCH", { removeQuestionIds: [id] })
                if (res?.ok) setQuestions(q => (q ?? []).filter(x => x.id !== id))
            }}
        />
    )
}
