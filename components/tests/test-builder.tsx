"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
    Sparkles, ListChecks, RefreshCw, Shuffle, Trash2, Eye, Loader2, Plus, CheckCircle2, AlertCircle,
    ClipboardList, CalendarClock, FileQuestion, Send, Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkingFields } from "@/components/test-manager"
import { QuestionCard, TYPE_LABEL, DIFFICULTY } from "@/components/question-bank/question-card"
import { QuestionFormDialog, type StoredQuestion } from "@/components/question-bank/question-form-dialog"
import { EMPTY_CLASSIFICATION, useBankMeta, useChapters } from "@/components/question-bank/classification"
import { TestPreviewDialog, totalMarks, groupBySubject } from "@/components/tests/test-preview-dialog"
import { EmptyState, LoadingRow, PaginationBar, SearchInput, readError, send } from "@/components/admin/kit"
import { MARKING_PRESETS, type MarkingScheme } from "@/lib/marking"
import { cn } from "@/lib/utils"

type Picked = { q: StoredQuestion; from: "auto" | "manual" }
const ANY = "__any"
const MANUAL_PAGE = 10

/** Step-by-step form for a new test, with a live summary and a full preview before saving. */
export function TestBuilder({ onCreated }: { onCreated: () => void }) {
    const meta = useBankMeta()

    // Details
    const [title, setTitle] = useState("")
    const [courseId, setCourseId] = useState("")
    const [duration, setDuration] = useState("60")
    const [batchIds, setBatchIds] = useState<Set<string>>(new Set())
    // Schedule & results
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [resultMode, setResultMode] = useState("INSTANT")
    const [showRank, setShowRank] = useState(false)
    const [marking, setMarking] = useState<MarkingScheme>(structuredClone(MARKING_PRESETS.STANDARD.scheme))
    // Questions
    const [mode, setMode] = useState<"auto" | "manual">("auto")
    const [picked, setPicked] = useState<Picked[]>([])

    const [previewOpen, setPreviewOpen] = useState(false)
    const [saving, setSaving] = useState<"draft" | "publish" | null>(null)
    const [saveError, setSaveError] = useState("")
    const [created, setCreated] = useState("")

    const questions = useMemo(() => picked.map(p => p.q), [picked])
    const pickedIds = useMemo(() => new Set(questions.map(q => q.id)), [questions])
    const batches = meta.batches.filter(b => !courseId || b.courseId === courseId)
    const chosenBatches = meta.batches.filter(b => batchIds.has(b.id))
    const minutes = parseInt(duration)

    const problems = [
        !title.trim() && "Add a test title",
        !(minutes > 0) && "Set a duration",
        batchIds.size === 0 && "Choose at least one batch",
        picked.length === 0 && "Add some questions",
        startTime && endTime && new Date(endTime) <= new Date(startTime) && "Closing time must be after opening time",
    ].filter(Boolean) as string[]

    const remove = (id: string) => setPicked(prev => prev.filter(p => p.q.id !== id))

    const create = async (publish: boolean) => {
        setSaveError("")
        if (problems.length) return setSaveError(problems[0])
        setSaving(publish ? "publish" : "draft")
        const subjects = new Set(questions.map(q => q.subjectId))
        const res = await send("/api/admin/tests", "POST", {
            title: title.trim(),
            duration: minutes,
            type: subjects.size > 1 ? "MIXED" : "SUBJECT",
            courseId: courseId || null,
            batchIds: Array.from(batchIds),
            questionIds: questions.map(q => q.id),
            // datetime-local has no time zone; convert here so the local time is kept.
            startTime: startTime ? new Date(startTime).toISOString() : null,
            endTime: endTime ? new Date(endTime).toISOString() : null,
            resultMode,
            showRank,
            marking,
            publish,
        })
        setSaving(null)
        if (!res?.ok) return setSaveError(await readError(res, "Couldn't create the test"))
        setCreated(`"${title.trim()}" was ${publish ? "created and published" : "saved as a draft"}.`)
        setPreviewOpen(false)
        setTitle(""); setStartTime(""); setEndTime(""); setPicked([]); setResultMode("INSTANT"); setShowRank(false)
        setMarking(structuredClone(MARKING_PRESETS.STANDARD.scheme))
        onCreated()
    }

    const actions = (inDialog: boolean) => (
        <>
            <Button variant="outline" onClick={() => create(false)} disabled={!!saving} className={inDialog ? "" : "w-full"}>
                {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save as draft
            </Button>
            <Button onClick={() => create(true)} disabled={!!saving} className={inDialog ? "" : "w-full"}>
                {saving === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Create &amp; publish
            </Button>
        </>
    )

    return (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
                {created && (
                    <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        <CheckCircle2 className="h-4 w-4" />{created} You can find it under All tests.
                    </p>
                )}

                <Step n={1} icon={ClipboardList} title="Test details">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="t-title">Title</Label>
                            <Input id="t-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. JEE Main Mock Test 5" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Course <Optional /></Label>
                            <Select value={courseId || ANY} onValueChange={v => { setCourseId(v === ANY ? "" : v); setBatchIds(new Set()) }}>
                                <SelectTrigger className="w-full" aria-label="Course"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANY}>Any course</SelectItem>
                                    {meta.courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="t-duration">Duration (minutes)</Label>
                            <Input id="t-duration" type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 space-y-1.5">
                        <Label>Batches that take this test</Label>
                        {batches.length === 0 ? (
                            <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-slate-500">No batches{courseId ? " in this course" : ""} yet. Create them under Courses &amp; Batches.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {batches.map(b => {
                                    const on = batchIds.has(b.id)
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setBatchIds(s => { const n = new Set(s); if (on) n.delete(b.id); else n.add(b.id); return n })}
                                            className={cn(
                                                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                                on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300",
                                            )}
                                        >
                                            {b.name}{!courseId && b.course ? <span className={on ? "text-indigo-100" : "text-slate-400"}> · {b.course.name}</span> : null}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </Step>

                <Step n={2} icon={CalendarClock} title="Schedule, results & marking">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="t-open">Opens <Optional /></Label>
                                    <Input id="t-open" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="t-close">Closes <Optional /></Label>
                                    <Input id="t-close" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Results</Label>
                                <Select value={resultMode} onValueChange={setResultMode}>
                                    <SelectTrigger className="w-full" aria-label="Result mode"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INSTANT">Instant: students see marks on submitting</SelectItem>
                                        <SelectItem value="MANUAL">Manual: hidden until you release them</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <Checkbox checked={showRank} onCheckedChange={c => setShowRank(c === true)} />Show students their rank
                            </label>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Marking</Label>
                            <MarkingFields value={marking} onChange={setMarking} />
                        </div>
                    </div>
                </Step>

                <Step n={3} icon={FileQuestion} title="Questions" right={<span className="text-sm text-slate-500">{picked.length} selected</span>}>
                    <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 sm:inline-grid sm:w-auto">
                        {([["auto", Sparkles, "Auto-generate"], ["manual", ListChecks, "Pick manually"]] as const).map(([m, Icon, label]) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                aria-pressed={mode === m}
                                className={cn("flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition", mode === m ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}
                            >
                                <Icon className="h-4 w-4" />{label}
                            </button>
                        ))}
                    </div>

                    {mode === "auto"
                        ? <AutoGenerate subjects={meta.subjects} picked={picked} setPicked={setPicked} />
                        : <ManualPicker meta={meta} picked={picked} pickedIds={pickedIds} setPicked={setPicked} />}
                </Step>
            </div>

            {/* Summary */}
            <aside className="space-y-3 xl:sticky xl:top-24">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                    <p className="mt-1 truncate text-lg font-bold text-slate-900">{title.trim() || "Untitled test"}</p>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <Stat label="Questions" value={picked.length} />
                        <Stat label="Marks" value={totalMarks(questions, marking)} />
                        <Stat label="Minutes" value={minutes > 0 ? minutes : "—"} />
                    </dl>
                    {picked.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm">
                            {groupBySubject(questions).map(g => (
                                <li key={g.subject} className="flex justify-between"><span className="text-slate-600">{g.subject}</span><span className="font-medium tabular-nums">{g.items.length}</span></li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-800">Batches: </span>{chosenBatches.length ? chosenBatches.map(b => b.name).join(", ") : "none chosen"}
                    </p>

                    {problems.length > 0 && (
                        <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                            {problems.map(p => <li key={p} className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{p}</li>)}
                        </ul>
                    )}
                    {saveError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{saveError}</p>}

                    <div className="mt-4 space-y-2">
                        <Button variant="secondary" className="w-full" onClick={() => setPreviewOpen(true)} disabled={picked.length === 0}>
                            <Eye className="h-4 w-4" />Preview test
                        </Button>
                        {actions(false)}
                    </div>
                </div>
            </aside>

            <TestPreviewDialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                summary={{
                    title: title.trim(),
                    duration: minutes > 0 ? minutes : null,
                    batches: chosenBatches.map(b => b.name),
                    opens: startTime ? new Date(startTime).toISOString() : null,
                    closes: endTime ? new Date(endTime).toISOString() : null,
                    marking,
                }}
                questions={questions}
                onRemove={remove}
                footer={<>
                    {saveError && <span className="self-center text-sm text-red-700">{saveError}</span>}
                    {actions(true)}
                </>}
            />
        </div>
    )
}

/* ------------------------------- Auto-generate ------------------------------ */

function AutoGenerate({ subjects, picked, setPicked }: {
    subjects: { id: string; name: string }[]
    picked: Picked[]
    setPicked: React.Dispatch<React.SetStateAction<Picked[]>>
}) {
    const [subjectIds, setSubjectIds] = useState<string[]>([])
    const [count, setCount] = useState("30")
    const [difficulty, setDifficulty] = useState("")
    const [type, setType] = useState("")
    const [even, setEven] = useState(true)
    const [busy, setBusy] = useState<string | null>(null) // "all" or a question id being swapped
    const [error, setError] = useState("")

    const auto = picked.filter(p => p.from === "auto")
    const manualIds = picked.filter(p => p.from === "manual").map(p => p.q.id)

    const request = async (body: Record<string, unknown>) => {
        const res = await send("/api/admin/tests/generate", "POST", { difficulty: difficulty || undefined, type: type || undefined, ...body })
        if (!res?.ok) { setError(await readError(res, "Couldn't generate questions")); return null }
        return (await res.json()).questions as StoredQuestion[]
    }

    const generate = async () => {
        setError("")
        setBusy("all")
        // Hand-picked questions stay; the generated ones are replaced.
        const qs = await request({ subjectIds, count: parseInt(count), even, excludeIds: manualIds })
        setBusy(null)
        if (qs) setPicked(prev => [...prev.filter(p => p.from === "manual"), ...qs.map(q => ({ q, from: "auto" as const }))])
    }

    const swap = async (q: StoredQuestion) => {
        if (!q.subjectId) return
        setError("")
        setBusy(q.id)
        const qs = await request({ subjectIds: [q.subjectId], count: 1, even: false, excludeIds: picked.map(p => p.q.id) })
        setBusy(null)
        if (qs?.[0]) setPicked(prev => prev.map(p => (p.q.id === q.id ? { q: qs[0], from: "auto" } : p)))
    }

    return (
        <div className="space-y-4">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="space-y-1.5">
                    <Label>Subjects</Label>
                    <div className="flex flex-wrap gap-2">
                        {subjects.length === 0 && <span className="text-sm text-slate-500">No subjects yet.</span>}
                        {subjects.map(s => {
                            const on = subjectIds.includes(s.id)
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setSubjectIds(ids => (on ? ids.filter(x => x !== s.id) : [...ids, s.id]))}
                                    className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300")}
                                >
                                    {s.name}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="g-count">Number of questions</Label>
                        <Input id="g-count" type="number" min={1} max={300} value={count} onChange={e => setCount(e.target.value)} className="bg-white" />
                    </div>
                    <AnySelect label="Difficulty" value={difficulty} onChange={setDifficulty} items={Object.fromEntries(Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]))} />
                    <AnySelect label="Type" value={type} onChange={setType} items={TYPE_LABEL} />
                    <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                        <Checkbox checked={even} onCheckedChange={c => setEven(c === true)} />Split evenly across subjects
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={generate} disabled={busy !== null || subjectIds.length === 0 || !(parseInt(count) > 0)}>
                        {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : auto.length ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        {auto.length ? "Regenerate" : "Generate questions"}
                    </Button>
                    {auto.length > 0 && (
                        <Button variant="ghost" onClick={() => setPicked(prev => prev.filter(p => p.from !== "auto"))} disabled={busy !== null}>Clear generated</Button>
                    )}
                </div>
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            </div>

            {auto.length > 0 ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">Review generated questions ({auto.length})</h4>
                        <p className="text-xs text-slate-500">Swap any you don&apos;t like, remove them, or regenerate the whole set. Nothing is saved until you create the test.</p>
                    </div>
                    <ol className="space-y-2">
                        {auto.map((p, i) => (
                            <li key={p.q.id}>
                                <QuestionCard
                                    question={p.q}
                                    number={i + 1}
                                    compact
                                    actions={<>
                                        <Button variant="outline" size="sm" onClick={() => swap(p.q)} disabled={busy !== null} title="Replace with another question from the same subject">
                                            {busy === p.q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}Swap
                                        </Button>
                                        <Button variant="ghost" size="icon-sm" className="text-red-600 hover:bg-red-50" onClick={() => setPicked(prev => prev.filter(x => x.q.id !== p.q.id))} aria-label="Remove" title="Remove">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>}
                                />
                            </li>
                        ))}
                    </ol>
                </div>
            ) : (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-slate-500">Choose subjects and how many questions you want, then generate. You&apos;ll review them here before creating the test.</p>
            )}
        </div>
    )
}

/* ------------------------------- Manual picker ------------------------------ */

function ManualPicker({ meta, picked, pickedIds, setPicked }: {
    meta: ReturnType<typeof useBankMeta>
    picked: Picked[]
    pickedIds: Set<string>
    setPicked: React.Dispatch<React.SetStateAction<Picked[]>>
}) {
    const [subjectId, setSubjectId] = useState("")
    const [chapterId, setChapterId] = useState("")
    const [difficulty, setDifficulty] = useState("")
    const [type, setType] = useState("")
    const [searchBox, setSearchBox] = useState("")
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [rows, setRows] = useState<StoredQuestion[]>([])
    const [total, setTotal] = useState(0)
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)
    const [showSelected, setShowSelected] = useState(false)
    const { chapters } = useChapters(subjectId, chapterId)

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchBox.trim()), 300)
        return () => clearTimeout(t)
    }, [searchBox])

    const key = JSON.stringify([subjectId, chapterId, difficulty, type, search])
    const [lastKey, setLastKey] = useState(key)
    if (key !== lastKey) { setLastKey(key); setPage(1) }

    const params = new URLSearchParams({ subjectId, page: String(page), limit: String(MANUAL_PAGE) })
    if (chapterId) params.set("chapterId", chapterId)
    if (difficulty) params.set("difficulty", difficulty)
    if (type) params.set("type", type)
    if (search) params.set("search", search)
    const query = params.toString()
    const loading = !!subjectId && loadedKey !== query

    const fetchPage = useCallback(async () => {
        const res = await fetch(`/api/admin/questions?${query}`).catch(() => null)
        return res?.ok ? ((await res.json()) as { data: StoredQuestion[]; meta: { total: number } }) : null
    }, [query])
    const apply = useCallback((r: { data: StoredQuestion[]; meta: { total: number } } | null, key: string) => {
        if (r) { setRows(r.data); setTotal(r.meta.total) }
        setLoadedKey(key)
    }, [])
    const load = () => fetchPage().then(r => apply(r, query))
    useEffect(() => { if (subjectId) fetchPage().then(r => apply(r, query)) }, [subjectId, fetchPage, apply, query])

    const select = (q: StoredQuestion, on: boolean) => setPicked(prev => {
        if (!on) return prev.filter(p => p.q.id !== q.id)
        return prev.some(p => p.q.id === q.id) ? prev : [...prev, { q, from: "manual" }]
    })
    const allOnPage = rows.length > 0 && rows.every(r => pickedIds.has(r.id))
    const selectPage = (on: boolean) => setPicked(prev => {
        if (!on) return prev.filter(p => !rows.some(r => r.id === p.q.id))
        const have = new Set(prev.map(p => p.q.id))
        return [...prev, ...rows.filter(r => !have.has(r.id)).map(q => ({ q, from: "manual" as const }))]
    })

    return (
        <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
                    <div className="space-y-1.5">
                        <Label>1. Subject</Label>
                        <Select value={subjectId} onValueChange={v => { setSubjectId(v); setChapterId("") }}>
                            <SelectTrigger className="w-full bg-white" aria-label="Subject"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                            <SelectContent>{meta.subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>2. Search within the subject</Label>
                        <SearchInput value={searchBox} onChange={setSearchBox} placeholder={subjectId ? "Keyword in the question or exam tag…" : "Choose a subject first"} className={!subjectId ? "pointer-events-none opacity-50" : undefined} />
                    </div>
                </div>
                {subjectId && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <AnySelect label="Chapter" value={chapterId} onChange={setChapterId} items={Object.fromEntries(chapters.map(c => [c.id, c.name]))} />
                        <AnySelect label="Difficulty" value={difficulty} onChange={setDifficulty} items={Object.fromEntries(Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]))} />
                        <AnySelect label="Type" value={type} onChange={setType} items={TYPE_LABEL} />
                    </div>
                )}
            </div>

            {!subjectId ? (
                <EmptyState icon={ListChecks} title="Choose a subject to see its questions" hint="Then narrow them down with a keyword, chapter, difficulty or type." />
            ) : (
                <div className="rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-2.5">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox checked={allOnPage} onCheckedChange={v => selectPage(v === true)} disabled={rows.length === 0} />Select all on this page
                        </label>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowSelected(s => !s)} disabled={picked.length === 0}>
                                {showSelected ? "Show results" : `Show selected (${picked.length})`}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />New question</Button>
                        </div>
                    </div>
                    <div className="space-y-2 bg-slate-50/50 p-3">
                        {showSelected ? (
                            picked.map((p, i) => (
                                <QuestionCard key={p.q.id} question={p.q} number={i + 1} compact selected onSelect={on => select(p.q, on)} />
                            ))
                        ) : loading && rows.length === 0 ? <LoadingRow /> : rows.length === 0 ? (
                            <EmptyState icon={ListChecks} title="No questions match" hint={search ? "Try another keyword." : "Add one with New question."} />
                        ) : (
                            <div className={cn("space-y-2", loading && "opacity-60")}>
                                {rows.map((q, i) => (
                                    <QuestionCard
                                        key={q.id}
                                        question={q}
                                        number={(page - 1) * MANUAL_PAGE + i + 1}
                                        compact
                                        selected={pickedIds.has(q.id)}
                                        onSelect={on => select(q, on)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {!showSelected && <PaginationBar page={page} pageSize={MANUAL_PAGE} total={total} onPage={setPage} noun="questions" sticky={false} />}
                </div>
            )}

            <QuestionFormDialog
                open={adding}
                question={null}
                defaults={{ ...EMPTY_CLASSIFICATION, subjectId, chapterId }}
                meta={meta}
                onClose={() => setAdding(false)}
                onSaved={q => {
                    // New questions come back without their names; the picker shows them after a reload.
                    load()
                    setPicked(prev => (prev.some(p => p.q.id === q.id) ? prev : [...prev, { q: { ...q, subject: meta.subjects.find(s => s.id === q.subjectId) ?? null }, from: "manual" }]))
                }}
            />
        </div>
    )
}

/* ---------------------------------- Bits ------------------------------------ */

function Step({ n, icon: Icon, title, right, children }: { n: number; icon: typeof Sparkles; title: string; right?: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5">
                <h3 className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{n}</span>
                    <Icon className="h-4 w-4 text-indigo-500" />{title}
                </h3>
                {right}
            </header>
            <div className="p-4 md:p-5">{children}</div>
        </section>
    )
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
    return <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">{children}</label>
}

function Optional() {
    return <span className="font-normal text-slate-400">(optional)</span>
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="rounded-lg bg-slate-50 px-2 py-2">
            <dd className="text-xl font-bold tabular-nums text-slate-900">{value}</dd>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        </div>
    )
}

function AnySelect({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: Record<string, string> }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Select value={value || ANY} onValueChange={v => onChange(v === ANY ? "" : v)}>
                <SelectTrigger className="w-full bg-white" aria-label={label}><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={ANY}>Any</SelectItem>
                    {Object.entries(items).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    )
}
