"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, Trash2, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestionCard } from "./question-card"
import type { StoredQuestion } from "./question-form-dialog"
import { ConfirmDialog, EmptyState, LoadingRow, PaginationBar, readError, send } from "@/components/admin/kit"

export type BankFilters = {
    courseId: string; batchId: string; subjectId: string; chapterId: string; subtopicId: string; difficulty: string; type: string
}

export const NO_FILTERS: BankFilters = { courseId: "", batchId: "", subjectId: "", chapterId: "", subtopicId: "", difficulty: "", type: "" }

/** Query string for the questions API. */
export function questionQuery(filters: BankFilters, search: string, page: number, limit: number) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    if (search) params.set("search", search)
    return params.toString()
}

/** The question list with edit / delete actions and pagination pinned to the bottom of the screen. */
export function Repository({ filters, search, refreshKey, onEdit, emptyAction }: {
    filters: BankFilters
    search: string
    refreshKey: number
    onEdit: (q: StoredQuestion) => void
    emptyAction?: React.ReactNode
}) {
    const [questions, setQuestions] = useState<StoredQuestion[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<StoredQuestion | null>(null)

    // Back to page 1 when the filters or search change
    const filterKey = JSON.stringify([filters, search, pageSize])
    const [lastKey, setLastKey] = useState(filterKey)
    if (filterKey !== lastKey) { setLastKey(filterKey); setPage(1) }

    const query = questionQuery(filters, search, page, pageSize)
    const requestKey = `${query}#${refreshKey}`
    const loading = loadedKey !== requestKey

    const fetchPage = useCallback(async () => {
        const res = await fetch(`/api/admin/questions?${query}`).catch(() => null)
        return res?.ok ? ((await res.json()) as { data: StoredQuestion[]; meta: { total: number } }) : null
    }, [query])
    const apply = useCallback((r: { data: StoredQuestion[]; meta: { total: number } } | null, key: string) => {
        if (r) { setQuestions(r.data); setTotal(r.meta.total) }
        setLoadedKey(key)
    }, [])
    const load = () => fetchPage().then(r => apply(r, requestKey))

    useEffect(() => { fetchPage().then(r => apply(r, requestKey)) }, [fetchPage, apply, requestKey])

    const goTo = (p: number) => {
        setPage(p)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const filtered = search || Object.values(filters).some(Boolean)

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="space-y-3 p-3 md:p-4">
                {loading && questions.length === 0 ? <LoadingRow /> : questions.length === 0 ? (
                    <EmptyState
                        icon={Library}
                        title={filtered ? "No questions match these filters" : "The question bank is empty"}
                        hint={filtered ? "Try a different search, or clear some filters." : "Add questions one by one, or import a PDF, CSV or question pack."}
                        action={filtered ? undefined : emptyAction}
                    />
                ) : (
                    <ol className={loading ? "space-y-3 opacity-60 transition-opacity" : "space-y-3"}>
                        {questions.map((q, i) => (
                            <li key={q.id}>
                                <QuestionCard
                                    question={q}
                                    number={(page - 1) * pageSize + i + 1}
                                    actions={<>
                                        <Button variant="outline" size="sm" onClick={() => onEdit(q)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                                        <Button variant="ghost" size="icon-sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleting(q)} aria-label="Delete question" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>}
                                />
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            <PaginationBar page={page} pageSize={pageSize} total={total} onPage={goTo} onPageSize={setPageSize} noun="questions" />

            <ConfirmDialog
                open={!!deleting}
                title="Delete this question?"
                description={deleting && (deleting._count?.tests
                    ? <p>It is used in {deleting._count.tests} test{deleting._count.tests === 1 ? "" : "s"}, so it can&apos;t be deleted. Remove it from those tests first.</p>
                    : <p>This can&apos;t be undone.</p>)}
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/admin/questions/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await load()
                    return null
                }}
            />
        </div>
    )
}
