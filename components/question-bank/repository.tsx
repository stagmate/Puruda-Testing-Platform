"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, Trash2, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QuestionView } from "./question-view"
import { EditorDialog } from "./editor-dialog"
import { draftFromQuestion, type QuestionDraft } from "@/lib/question-input"

export type BankFilters = {
    courseId: string; batchId: string; subjectId: string; chapterId: string; subtopicId: string; difficulty: string
}

type StoredQuestion = Parameters<typeof draftFromQuestion>[0] & {
    id: string
    subject?: { name: string } | null
    chapter?: { name: string } | null
    subtopic?: { name: string } | null
    _count?: { tests: number }
}

const PAGE_SIZE = 20

export function Repository({ filters, refreshKey }: { filters: BankFilters; refreshKey: number }) {
    const [questions, setQuestions] = useState<StoredQuestion[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [type, setType] = useState("")
    const [search, setSearch] = useState("")
    const [query, setQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<{ id: string; draft: QuestionDraft } | null>(null)

    // Debounce the search box
    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    // Back to page 1 when filters change
    const filterKey = JSON.stringify([filters, type, query])
    const [lastKey, setLastKey] = useState(filterKey)
    if (filterKey !== lastKey) { setLastKey(filterKey); setPage(1) }

    const fetchPage = useCallback(async () => {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
        Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
        if (type) params.set("type", type)
        if (query) params.set("search", query)
        const res = await fetch(`/api/admin/questions?${params}`)
        return res.ok ? ((await res.json()) as { data: StoredQuestion[]; meta: { total: number } }) : null
    }, [filters, page, type, query])

    const apply = (r: { data: StoredQuestion[]; meta: { total: number } } | null) => {
        if (r) { setQuestions(r.data); setTotal(r.meta.total) }
        setLoading(false)
    }
    const load = () => fetchPage().then(apply)

    useEffect(() => { fetchPage().then(apply) }, [fetchPage, refreshKey])

    const remove = async (q: StoredQuestion) => {
        if (!confirm("Delete this question? This can't be undone.")) return
        const res = await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" })
        if (!res.ok) return alert(await res.text())
        load()
    }

    const saveEdit = async (draft: QuestionDraft) => {
        if (!editing) return null
        const res = await fetch(`/api/admin/questions/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
        })
        if (!res.ok) return await res.text()
        setEditing(null)
        load()
        return null
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search question text…" className="pl-8" aria-label="Search questions" />
                </div>
                <Select value={type || "all"} onValueChange={v => setType(v === "all" ? "" : v)}>
                    <SelectTrigger className="sm:w-48" aria-label="Question type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="SINGLE">Single correct</SelectItem>
                        <SelectItem value="MULTIPLE">Multiple correct</SelectItem>
                        <SelectItem value="INTEGER">Integer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <p className="text-xs text-slate-500">{loading ? "Loading…" : `${total} question${total === 1 ? "" : "s"}`}</p>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : questions.length === 0 ? (
                <p className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">No questions match these filters.</p>
            ) : (
                <ul className="space-y-3">
                    {questions.map((q, i) => (
                        <li key={q.id} className="rounded-lg border bg-white p-3 sm:p-4">
                            <QuestionView draft={draftFromQuestion(q)} number={(page - 1) * PAGE_SIZE + i + 1} />
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                                <div className="flex flex-wrap gap-1 text-[11px]">
                                    {q.subject && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-800">{q.subject.name}</span>}
                                    {q.chapter && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-800">{q.chapter.name}</span>}
                                    {q.subtopic && <span className="rounded bg-pink-50 px-1.5 py-0.5 text-pink-800">{q.subtopic.name}</span>}
                                    {!!q._count?.tests && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">In {q._count.tests} test{q._count.tests === 1 ? "" : "s"}</span>}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setEditing({ id: q.id, draft: draftFromQuestion(q) })}>
                                        <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => remove(q)}>
                                        <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 text-sm">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-slate-500 tabular-nums">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}

            <EditorDialog
                open={!!editing}
                title="Edit question"
                initial={editing?.draft ?? null}
                onClose={() => setEditing(null)}
                onSave={saveEdit}
            />
        </div>
    )
}
