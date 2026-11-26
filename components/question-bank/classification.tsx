"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getJson, readError, send } from "@/components/admin/kit"
import type { QuestionContext } from "@/lib/question-context"

export type Named = { id: string; name: string }
export type BatchRow = Named & { courseId: string; course?: { name: string } | null }

/** Where a question is filed. Empty string = not set. */
export type Classification = { subjectId: string; chapterId: string; subtopicId: string; courseId: string; batchId: string }
export const EMPTY_CLASSIFICATION: Classification = { subjectId: "", chapterId: "", subtopicId: "", courseId: "", batchId: "" }

export const toContext = (c: Classification): QuestionContext => ({
    subjectId: c.subjectId || null, chapterId: c.chapterId || null, subtopicId: c.subtopicId || null,
    courseId: c.courseId || null, batchId: c.batchId || null,
})

export type BankMeta = { courses: Named[]; batches: BatchRow[]; subjects: Named[]; reload: () => Promise<void> }

/** Courses, batches and subjects for the question bank pickers. */
export function useBankMeta(): BankMeta {
    const [courses, setCourses] = useState<Named[]>([])
    const [batches, setBatches] = useState<BatchRow[]>([])
    const [subjects, setSubjects] = useState<Named[]>([])
    const fetchMeta = useCallback(() => Promise.all([
        getJson<Named[]>("/api/admin/courses", []),
        getJson<BatchRow[]>("/api/admin/batches", []),
        getJson<Named[]>("/api/admin/subjects", []),
    ]), [])
    const apply = useCallback(([c, b, s]: [Named[], BatchRow[], Named[]]) => { setCourses(c); setBatches(b); setSubjects(s) }, [])
    const reload = useCallback(() => fetchMeta().then(apply), [fetchMeta, apply])
    useEffect(() => { fetchMeta().then(apply) }, [fetchMeta, apply])
    return { courses, batches, subjects, reload }
}

/** Chapters of a subject and subtopics of a chapter, loaded on demand. */
export function useChapters(subjectId: string, chapterId: string) {
    const [chapters, setChapters] = useState<Named[]>([])
    const [subtopics, setSubtopics] = useState<Named[]>([])
    const [version, setVersion] = useState(0)
    useEffect(() => {
        let live = true
        if (subjectId) getJson<Named[]>(`/api/admin/chapters?subjectId=${encodeURIComponent(subjectId)}`, []).then(c => { if (live) setChapters(c) })
        return () => { live = false }
    }, [subjectId, version])
    useEffect(() => {
        let live = true
        if (chapterId) getJson<Named[]>(`/api/admin/subtopics?chapterId=${encodeURIComponent(chapterId)}`, []).then(s => { if (live) setSubtopics(s) })
        return () => { live = false }
    }, [chapterId, version])
    return {
        chapters: subjectId ? chapters : [],
        subtopics: chapterId ? subtopics : [],
        refresh: () => setVersion(v => v + 1),
    }
}

const NONE = "__none"

/**
 * Subject › chapter › subtopic and course › batch pickers. Changing a level clears
 * the levels below it.
 *  - mode "filter": every level can be "All …".
 *  - mode "assign": subject is required, the rest can be "None"; subjects,
 *    chapters and subtopics can be created on the spot.
 */
export function ClassificationFields({ value, onChange, meta, mode }: {
    value: Classification
    onChange: (c: Classification) => void
    meta: BankMeta
    mode: "filter" | "assign"
}) {
    const { chapters, subtopics, refresh } = useChapters(value.subjectId, value.chapterId)
    const filter = mode === "filter"

    const set = (key: keyof Classification, raw: string) => {
        const v = raw === NONE ? "" : raw
        const next = { ...value, [key]: v }
        if (key === "subjectId") { next.chapterId = ""; next.subtopicId = "" }
        if (key === "chapterId") next.subtopicId = ""
        if (key === "courseId" && next.batchId && meta.batches.find(b => b.id === next.batchId)?.courseId !== v) next.batchId = ""
        if (key === "batchId" && v) next.courseId = meta.batches.find(b => b.id === v)?.courseId ?? next.courseId
        onChange(next)
    }

    const batches = meta.batches.filter(b => !value.courseId || b.courseId === value.courseId)
    const none = (what: string) => (filter ? `All ${what}` : "None")

    return (
        <div className="space-y-4">
            <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Topic</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Picker
                        label="Subject"
                        value={value.subjectId}
                        items={meta.subjects}
                        onChange={v => set("subjectId", v)}
                        noneLabel={filter ? "All subjects" : undefined}
                        placeholder="Choose a subject"
                        onCreate={filter ? undefined : async name => {
                            const res = await send("/api/admin/subjects", "POST", { name })
                            if (!res?.ok) return readError(res)
                            const created: Named = await res.json()
                            await meta.reload()
                            set("subjectId", created.id)
                            return null
                        }}
                    />
                    <Picker
                        label="Chapter"
                        value={value.chapterId}
                        items={chapters}
                        onChange={v => set("chapterId", v)}
                        noneLabel={none("chapters")}
                        disabled={!value.subjectId}
                        onCreate={filter ? undefined : async name => {
                            const res = await send("/api/admin/chapters", "POST", { name, subjectId: value.subjectId })
                            if (!res?.ok) return readError(res)
                            const created: Named = await res.json()
                            refresh()
                            set("chapterId", created.id)
                            return null
                        }}
                    />
                    <Picker
                        label="Subtopic"
                        value={value.subtopicId}
                        items={subtopics}
                        onChange={v => set("subtopicId", v)}
                        noneLabel={none("subtopics")}
                        disabled={!value.chapterId}
                        onCreate={filter ? undefined : async name => {
                            const res = await send("/api/admin/subtopics", "POST", { name, chapterId: value.chapterId })
                            if (!res?.ok) return readError(res)
                            const created: Named = await res.json()
                            refresh()
                            set("subtopicId", created.id)
                            return null
                        }}
                    />
                </div>
            </fieldset>
            <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Course &amp; batch</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Picker label="Course" value={value.courseId} items={meta.courses} onChange={v => set("courseId", v)} noneLabel={none("courses")} />
                    <Picker label="Batch" value={value.batchId} items={batches} onChange={v => set("batchId", v)} noneLabel={none("batches")} />
                </div>
            </fieldset>
        </div>
    )
}

function Picker({ label, value, items, onChange, noneLabel, placeholder, disabled, onCreate }: {
    label: string
    value: string
    items: Named[]
    onChange: (v: string) => void
    noneLabel?: string
    placeholder?: string
    disabled?: boolean
    onCreate?: (name: string) => Promise<string | null>
}) {
    const [creating, setCreating] = useState(false)
    const [name, setName] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    const create = async () => {
        if (!onCreate || !name.trim()) return
        setBusy(true)
        const err = await onCreate(name.trim())
        setBusy(false)
        if (err) return setError(err)
        setCreating(false); setName(""); setError("")
    }

    return (
        <div className="min-w-0 space-y-1">
            <span className="text-sm font-medium text-slate-800">{label}</span>
            {creating ? (
                <div className="flex gap-1">
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={`New ${label.toLowerCase()}`}
                        aria-label={`New ${label.toLowerCase()} name`}
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); create() } if (e.key === "Escape") setCreating(false) }}
                    />
                    <Button type="button" size="icon" onClick={create} disabled={busy || !name.trim()} aria-label="Create">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => { setCreating(false); setError("") }} aria-label="Cancel"><X className="h-4 w-4" /></Button>
                </div>
            ) : (
                <div className="flex gap-1">
                    <Select value={value || (noneLabel ? NONE : "")} onValueChange={onChange} disabled={disabled}>
                        <SelectTrigger className="w-full min-w-0 bg-white" aria-label={label}><SelectValue placeholder={placeholder} /></SelectTrigger>
                        <SelectContent>
                            {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
                            {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {onCreate && (
                        <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={disabled} onClick={() => setCreating(true)} aria-label={`New ${label.toLowerCase()}`} title={`New ${label.toLowerCase()}`}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    )
}
