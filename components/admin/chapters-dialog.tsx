"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronRight, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getJson, plural, readError, send } from "@/components/admin/kit"
import { cn } from "@/lib/utils"

type Chapter = { id: string; name: string; _count?: { subtopics: number; questions: number } }
type Subtopic = { id: string; name: string; _count?: { questions: number } }

/** Add, rename and delete the chapters of a subject and the subtopics of each chapter. */
export function ChaptersDialog({ subject, onClose }: { subject: { id: string; name: string }; onClose: () => void }) {
    const [chapters, setChapters] = useState<Chapter[] | null>(null)
    const [open, setOpen] = useState<string | null>(null)
    const [error, setError] = useState("")

    const fetchChapters = useCallback(() => getJson<Chapter[]>(`/api/admin/chapters?subjectId=${encodeURIComponent(subject.id)}`, []), [subject.id])
    const load = useCallback(() => fetchChapters().then(setChapters), [fetchChapters])
    useEffect(() => { fetchChapters().then(setChapters) }, [fetchChapters])

    const act = async (p: Promise<Response | null>) => {
        setError("")
        const res = await p
        if (!res?.ok) { setError(await readError(res)); return false }
        await load()
        return true
    }

    return (
        <Dialog open onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{subject.name}: chapters &amp; subtopics</DialogTitle>
                    <DialogDescription>Open a chapter to manage its subtopics. Chapters and subtopics that questions use can&apos;t be deleted.</DialogDescription>
                </DialogHeader>

                <AddRow placeholder="New chapter name" label="Add chapter" onAdd={name => act(send("/api/admin/chapters", "POST", { name, subjectId: subject.id }))} />
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

                {chapters === null ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : chapters.length === 0 ? (
                    <p className="rounded-lg border border-dashed py-6 text-center text-sm text-slate-500">No chapters yet.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {chapters.map(c => (
                            <li key={c.id}>
                                <EditableRow
                                    name={c.name}
                                    meta={`${plural(c._count?.subtopics ?? 0, "subtopic")} · ${plural(c._count?.questions ?? 0, "question")}`}
                                    expanded={open === c.id}
                                    onToggle={() => setOpen(o => (o === c.id ? null : c.id))}
                                    onRename={name => act(send(`/api/admin/chapters/${c.id}`, "PATCH", { name }))}
                                    onDelete={() => act(send(`/api/admin/chapters/${c.id}`, "DELETE"))}
                                />
                                {open === c.id && <Subtopics chapterId={c.id} onError={setError} onChanged={load} />}
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    )
}

function Subtopics({ chapterId, onError, onChanged }: { chapterId: string; onError: (e: string) => void; onChanged: () => void }) {
    const [items, setItems] = useState<Subtopic[] | null>(null)
    const fetchItems = useCallback(() => getJson<Subtopic[]>(`/api/admin/subtopics?chapterId=${encodeURIComponent(chapterId)}`, []), [chapterId])
    const load = useCallback(() => fetchItems().then(setItems), [fetchItems])
    useEffect(() => { fetchItems().then(setItems) }, [fetchItems])

    const act = async (p: Promise<Response | null>) => {
        onError("")
        const res = await p
        if (!res?.ok) { onError(await readError(res)); return false }
        await load()
        onChanged()
        return true
    }

    return (
        <div className="space-y-2 border-t bg-slate-50 py-3 pl-10 pr-3">
            {items === null ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
                <ul className="divide-y rounded-md border bg-white">
                    {items.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No subtopics yet.</li>}
                    {items.map(s => (
                        <li key={s.id}>
                            <EditableRow
                                name={s.name}
                                meta={plural(s._count?.questions ?? 0, "question")}
                                onRename={name => act(send(`/api/admin/subtopics/${s.id}`, "PATCH", { name }))}
                                onDelete={() => act(send(`/api/admin/subtopics/${s.id}`, "DELETE"))}
                                small
                            />
                        </li>
                    ))}
                </ul>
            )}
            <AddRow placeholder="New subtopic name" label="Add subtopic" onAdd={name => act(send("/api/admin/subtopics", "POST", { name, chapterId }))} small />
        </div>
    )
}

function AddRow({ placeholder, label, onAdd, small }: { placeholder: string; label: string; onAdd: (name: string) => Promise<boolean>; small?: boolean }) {
    const [name, setName] = useState("")
    const [busy, setBusy] = useState(false)
    const add = async () => {
        if (!name.trim()) return
        setBusy(true)
        if (await onAdd(name.trim())) setName("")
        setBusy(false)
    }
    return (
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add() }}>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cn("bg-white", small && "h-8")} />
            <Button type="submit" size={small ? "sm" : "default"} variant={small ? "outline" : "default"} disabled={busy || !name.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{label}
            </Button>
        </form>
    )
}

function EditableRow({ name, meta, expanded, onToggle, onRename, onDelete, small }: {
    name: string; meta: string; expanded?: boolean; onToggle?: () => void
    onRename: (name: string) => Promise<boolean>; onDelete: () => Promise<boolean>; small?: boolean
}) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(name)
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState(false)

    const run = async (fn: () => Promise<boolean>) => { setBusy(true); const ok = await fn(); setBusy(false); return ok }

    if (editing) {
        return (
            <form className={cn("flex items-center gap-2 px-3", small ? "py-1.5" : "py-2")} onSubmit={async e => { e.preventDefault(); if (value.trim() && await run(() => onRename(value.trim()))) setEditing(false) }}>
                <Input value={value} onChange={e => setValue(e.target.value)} className="h-8" autoFocus aria-label="Name" />
                <Button type="submit" size="icon-sm" disabled={busy} aria-label="Save">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => { setEditing(false); setValue(name) }} aria-label="Cancel"><X className="h-4 w-4" /></Button>
            </form>
        )
    }

    return (
        <div className={cn("flex items-center gap-2 px-3", small ? "py-1.5" : "py-2.5")}>
            {onToggle ? (
                <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={expanded}>
                    <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", expanded && "rotate-90")} />
                    <span className="truncate font-medium text-slate-900">{name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{meta}</span>
                </button>
            ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm text-slate-800">{name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{meta}</span>
                </div>
            )}
            {confirming ? (
                <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-600">Delete?</span>
                    <Button size="sm" variant="destructive" className="h-7" disabled={busy} onClick={async () => { await run(onDelete); setConfirming(false) }}>
                        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Yes
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setConfirming(false)}>No</Button>
                </div>
            ) : (
                <div className="flex gap-0.5">
                    <Button size="icon-sm" variant="ghost" onClick={() => { setValue(name); setEditing(true) }} aria-label={`Rename ${name}`} title="Rename"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon-sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirming(true)} aria-label={`Delete ${name}`} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
            )}
        </div>
    )
}
