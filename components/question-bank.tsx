"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Library, PencilLine, FileUp, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Repository, type BankFilters } from "@/components/question-bank/repository"
import { AddQuestion } from "@/components/question-bank/add-question"
import { PdfImport } from "@/components/question-bank/pdf-import"
import { CsvUpload } from "@/components/question-bank/csv-upload"
import { cleanContext } from "@/lib/question-context"

type Named = { id: string; name: string }
type BatchRow = Named & { courseId: string }
type Level = "SUBJECT" | "CHAPTER" | "SUBTOPIC"

const ALL = "all"
const NO_FILTERS: BankFilters = { courseId: "", batchId: "", subjectId: "", chapterId: "", subtopicId: "", difficulty: "" }

async function getJson<T>(url: string, fallback: T): Promise<T> {
    try {
        const res = await fetch(url)
        return res.ok ? await res.json() : fallback
    } catch {
        return fallback
    }
}

export function QuestionBankManagement() {
    const [courses, setCourses] = useState<Named[]>([])
    const [batches, setBatches] = useState<BatchRow[]>([])
    const [subjects, setSubjects] = useState<Named[]>([])
    const [chapters, setChapters] = useState<Named[]>([])
    const [subtopics, setSubtopics] = useState<Named[]>([])
    const [filters, setFilters] = useState<BankFilters>(NO_FILTERS)
    const [refreshKey, setRefreshKey] = useState(0)
    const [creating, setCreating] = useState<Level | null>(null)
    const [newName, setNewName] = useState("")
    const [createError, setCreateError] = useState("")

    const fetchMeta = useCallback(() => Promise.all([
        getJson<Named[]>("/api/admin/courses", []),
        getJson<BatchRow[]>("/api/admin/batches", []),
        getJson<Named[]>("/api/admin/subjects", []),
    ]), [])
    const applyMeta = ([c, b, s]: [Named[], BatchRow[], Named[]]) => { setCourses(c); setBatches(b); setSubjects(s) }
    useEffect(() => { fetchMeta().then(applyMeta) }, [fetchMeta])

    useEffect(() => {
        if (!filters.subjectId) return
        getJson<Named[]>(`/api/admin/chapters?subjectId=${encodeURIComponent(filters.subjectId)}`, []).then(setChapters)
    }, [filters.subjectId, refreshKey])

    useEffect(() => {
        if (!filters.chapterId) return
        getJson<Named[]>(`/api/admin/subtopics?chapterId=${encodeURIComponent(filters.chapterId)}`, []).then(setSubtopics)
    }, [filters.chapterId, refreshKey])

    // Changing a level clears the levels below it.
    const setFilter = (key: keyof BankFilters, raw: string) => {
        const value = raw === ALL ? "" : raw
        setFilters(f => {
            const next = { ...f, [key]: value }
            if (key === "courseId") next.batchId = ""
            if (key === "subjectId") { next.chapterId = ""; next.subtopicId = ""; setChapters([]); setSubtopics([]) }
            if (key === "chapterId") { next.subtopicId = ""; setSubtopics([]) }
            return next
        })
    }

    const context = useMemo(() => cleanContext(filters), [filters])
    const contextLabel = useMemo(() => {
        const name = (list: Named[], id: string) => list.find(x => x.id === id)?.name
        const parts = [name(subjects, filters.subjectId), name(chapters, filters.chapterId), name(subtopics, filters.subtopicId)].filter(Boolean)
        return parts.length ? parts.join(" › ") : "no subject selected"
    }, [subjects, chapters, subtopics, filters])

    const createLevel = async () => {
        if (!creating || !newName.trim()) return
        setCreateError("")
        const target = {
            SUBJECT: { url: "/api/admin/subjects", body: { name: newName.trim() } },
            CHAPTER: { url: "/api/admin/chapters", body: { name: newName.trim(), subjectId: filters.subjectId } },
            SUBTOPIC: { url: "/api/admin/subtopics", body: { name: newName.trim(), chapterId: filters.chapterId } },
        }[creating]
        const res = await fetch(target.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target.body) })
        if (!res.ok) return setCreateError(await res.text() || "Couldn't create it")
        const created: Named = await res.json()
        if (creating === "SUBJECT") { applyMeta(await fetchMeta()); setFilter("subjectId", created.id) }
        if (creating === "CHAPTER") { setChapters(c => [...c, created]); setFilter("chapterId", created.id) }
        if (creating === "SUBTOPIC") { setSubtopics(s => [...s, created]); setFilter("subtopicId", created.id) }
        setCreating(null)
        setNewName("")
    }

    const saved = () => setRefreshKey(k => k + 1)
    const visibleBatches = batches.filter(b => !filters.courseId || b.courseId === filters.courseId)

    return (
        <Card>
            <CardHeader className="px-4 md:px-6">
                <CardTitle>Question Bank</CardTitle>
                <CardDescription>Filter by subject, chapter and subtopic. New questions are saved to the selected subject, chapter and subtopic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 md:px-6">
                {/* Filters */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FilterSelect label="Subject" value={filters.subjectId} items={subjects} onChange={v => setFilter("subjectId", v)} allLabel="All subjects" onAdd={() => setCreating("SUBJECT")} />
                    <FilterSelect label="Chapter" value={filters.chapterId} items={chapters} onChange={v => setFilter("chapterId", v)} allLabel="All chapters" disabled={!filters.subjectId} onAdd={() => setCreating("CHAPTER")} />
                    <FilterSelect label="Subtopic" value={filters.subtopicId} items={subtopics} onChange={v => setFilter("subtopicId", v)} allLabel="All subtopics" disabled={!filters.chapterId} onAdd={() => setCreating("SUBTOPIC")} />
                    <FilterSelect label="Course" value={filters.courseId} items={courses} onChange={v => setFilter("courseId", v)} allLabel="All courses" />
                    <FilterSelect label="Batch" value={filters.batchId} items={visibleBatches} onChange={v => setFilter("batchId", v)} allLabel="All batches" />
                    <FilterSelect
                        label="Difficulty"
                        value={filters.difficulty}
                        items={[{ id: "BEGINNER", name: "Beginner" }, { id: "INTERMEDIATE", name: "Intermediate" }, { id: "ADVANCED", name: "Advanced" }]}
                        onChange={v => setFilter("difficulty", v)}
                        allLabel="Any difficulty"
                    />
                </div>

                <Tabs defaultValue="repository">
                    <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto">
                        <TabsTrigger value="repository"><Library className="mr-1.5 h-4 w-4" />Questions</TabsTrigger>
                        <TabsTrigger value="add"><PencilLine className="mr-1.5 h-4 w-4" />Add</TabsTrigger>
                        <TabsTrigger value="pdf"><FileUp className="mr-1.5 h-4 w-4" />Import PDF</TabsTrigger>
                        <TabsTrigger value="csv"><Table2 className="mr-1.5 h-4 w-4" />CSV</TabsTrigger>
                    </TabsList>

                    <TabsContent value="repository"><Repository filters={filters} refreshKey={refreshKey} /></TabsContent>
                    <TabsContent value="add"><AddQuestion context={context} contextLabel={contextLabel} onSaved={saved} /></TabsContent>
                    <TabsContent value="pdf"><PdfImport context={context} contextLabel={contextLabel} onSaved={saved} /></TabsContent>
                    <TabsContent value="csv"><CsvUpload context={context} contextLabel={contextLabel} onSaved={saved} /></TabsContent>
                </Tabs>

                <Dialog open={!!creating} onOpenChange={o => { if (!o) { setCreating(null); setCreateError("") } }}>
                    <DialogContent className="w-[calc(100vw-1rem)] max-w-md">
                        <DialogHeader><DialogTitle>New {creating?.toLowerCase()}</DialogTitle></DialogHeader>
                        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" autoFocus onKeyDown={e => e.key === "Enter" && createLevel()} />
                        {createError && <p className="text-sm text-red-600">{createError}</p>}
                        <Button onClick={createLevel} disabled={!newName.trim()}>Create</Button>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}

function FilterSelect({ label, value, items, onChange, allLabel, disabled, onAdd }: {
    label: string
    value: string
    items: Named[]
    onChange: (v: string) => void
    allLabel: string
    disabled?: boolean
    onAdd?: () => void
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-slate-600">{label}</Label>
            <div className="flex gap-2">
                <Select value={value || ALL} onValueChange={onChange} disabled={disabled}>
                    <SelectTrigger className="w-full min-w-0" aria-label={label}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>{allLabel}</SelectItem>
                        {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {onAdd && (
                    <Button variant="outline" size="icon" className="shrink-0" disabled={disabled} onClick={onAdd} aria-label={`New ${label.toLowerCase()}`}>
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
