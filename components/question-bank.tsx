"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, SlidersHorizontal, Upload, X, FileUp, Table2, PackageOpen, FolderTree } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Repository, NO_FILTERS, type BankFilters } from "@/components/question-bank/repository"
import { QuestionFormDialog, type StoredQuestion } from "@/components/question-bank/question-form-dialog"
import { ClassificationFields, EMPTY_CLASSIFICATION, toContext, useBankMeta, useChapters, type BankMeta, type Classification } from "@/components/question-bank/classification"
import { TYPE_LABEL, DIFFICULTY } from "@/components/question-bank/question-card"
import { PdfImport } from "@/components/question-bank/pdf-import"
import { CsvUpload } from "@/components/question-bank/csv-upload"
import { PackImport } from "@/components/question-bank/pack-import"
import { SearchInput } from "@/components/admin/kit"

const ANY = "__any"
const classificationOf = (f: BankFilters): Classification => ({ subjectId: f.subjectId, chapterId: f.chapterId, subtopicId: f.subtopicId, courseId: f.courseId, batchId: f.batchId })

export function QuestionBankManagement() {
    const meta = useBankMeta()
    const [filters, setFilters] = useState<BankFilters>(NO_FILTERS)
    const [searchBox, setSearchBox] = useState("")
    const [search, setSearch] = useState("")
    const [refreshKey, setRefreshKey] = useState(0)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [editing, setEditing] = useState<StoredQuestion | "new" | null>(null)
    const { chapters, subtopics } = useChapters(filters.subjectId, filters.chapterId)

    // Debounce the search box
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchBox.trim()), 300)
        return () => clearTimeout(t)
    }, [searchBox])

    const refresh = () => setRefreshKey(k => k + 1)

    // Active filters as removable chips
    const chips = useMemo(() => {
        const name = (list: { id: string; name: string }[], id: string) => list.find(x => x.id === id)?.name ?? "…"
        const out: { key: keyof BankFilters; label: string; clears: (keyof BankFilters)[] }[] = []
        if (filters.subjectId) out.push({ key: "subjectId", label: `Subject: ${name(meta.subjects, filters.subjectId)}`, clears: ["subjectId", "chapterId", "subtopicId"] })
        if (filters.chapterId) out.push({ key: "chapterId", label: `Chapter: ${name(chapters, filters.chapterId)}`, clears: ["chapterId", "subtopicId"] })
        if (filters.subtopicId) out.push({ key: "subtopicId", label: `Subtopic: ${name(subtopics, filters.subtopicId)}`, clears: ["subtopicId"] })
        if (filters.courseId) out.push({ key: "courseId", label: `Course: ${name(meta.courses, filters.courseId)}`, clears: ["courseId", "batchId"] })
        if (filters.batchId) out.push({ key: "batchId", label: `Batch: ${name(meta.batches, filters.batchId)}`, clears: ["batchId"] })
        if (filters.difficulty) out.push({ key: "difficulty", label: DIFFICULTY[filters.difficulty]?.label ?? filters.difficulty, clears: ["difficulty"] })
        if (filters.type) out.push({ key: "type", label: TYPE_LABEL[filters.type] ?? filters.type, clears: ["type"] })
        return out
    }, [filters, meta.subjects, meta.courses, meta.batches, chapters, subtopics])

    const clearChip = (keys: (keyof BankFilters)[]) => setFilters(f => ({ ...f, ...Object.fromEntries(keys.map(k => [k, ""])) }))
    const addButton = <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add question</Button>

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:p-4">
                <SearchInput value={searchBox} onChange={setSearchBox} placeholder="Search question text or exam tag…" className="flex-1" />
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setFiltersOpen(true)} className="relative">
                        <SlidersHorizontal className="h-4 w-4" />Filters
                        {chips.length > 0 && <span className="ml-0.5 rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white">{chips.length}</span>}
                    </Button>
                    <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import</Button>
                    {addButton}
                </div>
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtered by</span>
                    {chips.map(c => (
                        <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-indigo-800">
                            {c.label}
                            <button type="button" onClick={() => clearChip(c.clears)} className="rounded-full p-0.5 hover:bg-indigo-100" aria-label={`Remove filter ${c.label}`}><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                    <button type="button" onClick={() => setFilters(NO_FILTERS)} className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline">Clear all</button>
                </div>
            )}

            <Repository filters={filters} search={search} refreshKey={refreshKey} onEdit={q => setEditing(q)} emptyAction={addButton} />

            <FilterDialog open={filtersOpen} value={filters} meta={meta} onClose={() => setFiltersOpen(false)} onApply={f => { setFilters(f); setFiltersOpen(false) }} />

            <ImportDialog open={importOpen} defaults={classificationOf(filters)} meta={meta} onClose={() => setImportOpen(false)} onSaved={refresh} />

            <QuestionFormDialog
                open={editing !== null}
                question={editing === "new" ? null : editing}
                defaults={classificationOf(filters)}
                meta={meta}
                onClose={() => setEditing(null)}
                onSaved={refresh}
            />
        </div>
    )
}

/** All filters in one modal; nothing changes until Apply. */
function FilterDialog({ open, value, meta, onClose, onApply }: {
    open: boolean; value: BankFilters; meta: BankMeta; onClose: () => void; onApply: (f: BankFilters) => void
}) {
    const [draft, setDraft] = useState<BankFilters>(value)
    const [wasOpen, setWasOpen] = useState(false)
    if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(value) }

    const pick = (label: string, key: "difficulty" | "type", items: Record<string, string>) => (
        <div className="space-y-1">
            <span className="text-sm font-medium text-slate-800">{label}</span>
            <Select value={draft[key] || ANY} onValueChange={v => setDraft(d => ({ ...d, [key]: v === ANY ? "" : v }))}>
                <SelectTrigger className="w-full bg-white" aria-label={label}><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={ANY}>Any</SelectItem>
                    {Object.entries(items).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-indigo-500" />Filter questions</DialogTitle>
                    <DialogDescription>Narrow the list by topic, course, difficulty and type.</DialogDescription>
                </DialogHeader>
                <ClassificationFields value={classificationOf(draft)} onChange={c => setDraft(d => ({ ...d, ...c }))} meta={meta} mode="filter" />
                <fieldset className="space-y-2">
                    <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Question</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {pick("Difficulty", "difficulty", Object.fromEntries(Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label])))}
                        {pick("Type", "type", TYPE_LABEL)}
                    </div>
                </fieldset>
                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
                    <Button variant="ghost" onClick={() => setDraft(NO_FILTERS)}>Reset all</Button>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={() => onApply(draft)}>Apply filters</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** PDF, CSV and question-pack imports in one modal. PDF and CSV save to the chosen subject. */
function ImportDialog({ open, defaults, meta, onClose, onSaved }: {
    open: boolean; defaults: Classification; meta: BankMeta; onClose: () => void; onSaved: () => void
}) {
    const [place, setPlace] = useState<Classification>(defaults)
    const [tab, setTab] = useState("pdf")
    const [wasOpen, setWasOpen] = useState(false)
    if (open !== wasOpen) { setWasOpen(open); if (open) setPlace(defaults.subjectId ? defaults : { ...EMPTY_CLASSIFICATION, courseId: defaults.courseId, batchId: defaults.batchId }) }
    const { chapters, subtopics } = useChapters(place.subjectId, place.chapterId)

    const label = useMemo(() => {
        const name = (list: { id: string; name: string }[], id: string) => list.find(x => x.id === id)?.name
        const parts = [name(meta.subjects, place.subjectId), name(chapters, place.chapterId), name(subtopics, place.subtopicId)].filter(Boolean)
        return parts.length ? parts.join(" › ") : "no subject selected"
    }, [meta.subjects, chapters, subtopics, place])

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-5xl" onInteractOutside={e => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-500" />Import questions</DialogTitle>
                    <DialogDescription>Bring in many questions at once from a PDF paper, a CSV sheet or a question pack.</DialogDescription>
                </DialogHeader>
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="h-auto w-full justify-start overflow-x-auto">
                        <TabsTrigger value="pdf" className="flex-none"><FileUp className="mr-1.5 h-4 w-4" />PDF paper</TabsTrigger>
                        <TabsTrigger value="csv" className="flex-none"><Table2 className="mr-1.5 h-4 w-4" />CSV sheet</TabsTrigger>
                        <TabsTrigger value="pack" className="flex-none"><PackageOpen className="mr-1.5 h-4 w-4" />Question pack</TabsTrigger>
                    </TabsList>

                    {tab !== "pack" && (
                        <section className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FolderTree className="h-4 w-4 text-indigo-500" />Save imported questions to</h3>
                            <ClassificationFields value={place} onChange={setPlace} meta={meta} mode="assign" />
                        </section>
                    )}

                    <TabsContent value="pdf" className="mt-4"><PdfImport context={toContext(place)} contextLabel={label} onSaved={onSaved} /></TabsContent>
                    <TabsContent value="csv" className="mt-4"><CsvUpload context={toContext(place)} contextLabel={label} onSaved={onSaved} /></TabsContent>
                    <TabsContent value="pack" className="mt-4">
                        <PackImport
                            courses={meta.courses}
                            batches={meta.batches}
                            subjects={meta.subjects}
                            defaultCourseId={defaults.courseId}
                            defaultBatchId={defaults.batchId}
                            onSaved={onSaved}
                            onSubjectsChanged={meta.reload}
                        />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
