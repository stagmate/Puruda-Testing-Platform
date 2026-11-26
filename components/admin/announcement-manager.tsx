"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Megaphone, Plus, Pencil, Trash2, CalendarRange } from "lucide-react"
import { NewBadge } from "@/components/new-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Badge, ConfirmDialog, EmptyState, Field, FormDialog, LoadingRow, Panel, PanelHeader, SearchInput, getJson, readError, send,
} from "@/components/admin/kit"
import { announcementStatus, dayEnd, dayStart, isNewAnnouncement, toDayInput, NEW_FOR_DAYS, type AnnouncementStatus } from "@/lib/announcements"
import { cn } from "@/lib/utils"

export type Announcement = {
    id: string
    title: string
    content: string
    createdAt: string
    startsAt: string
    endsAt: string | null
    author?: { name: string | null; role?: string } | null
}

const STATUS: Record<AnnouncementStatus, { label: string; tone: "green" | "blue" | "slate" }> = {
    live: { label: "Live", tone: "green" },
    scheduled: { label: "Scheduled", tone: "blue" },
    expired: { label: "Expired", tone: "slate" },
}
const FILTERS = ["all", "live", "scheduled", "expired"] as const

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

/** Create, edit, schedule and delete announcements. */
export function AnnouncementManager() {
    const [items, setItems] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all")
    const [search, setSearch] = useState("")
    const [editing, setEditing] = useState<Announcement | "new" | null>(null)
    const [deleting, setDeleting] = useState<Announcement | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const openEditor = (a: Announcement | "new") => { setNow(Date.now()); setEditing(a) }

    const fetchItems = useCallback(() => getJson<Announcement[]>("/api/announcements?scope=manage", []), [])
    const apply = useCallback((list: Announcement[]) => { setItems(list); setNow(Date.now()); setLoading(false) }, [])
    const load = useCallback(() => fetchItems().then(apply), [fetchItems, apply])
    useEffect(() => { fetchItems().then(apply) }, [fetchItems, apply])

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: items.length, live: 0, scheduled: 0, expired: 0 }
        for (const a of items) c[announcementStatus(a, now)]++
        return c
    }, [items, now])

    const q = search.trim().toLowerCase()
    const shown = items.filter(a => (filter === "all" || announcementStatus(a, now) === filter) && (!q || `${a.title} ${a.content}`.toLowerCase().includes(q)))

    return (
        <Panel>
            <PanelHeader
                title="Announcements"
                subtitle={`Shown on student and staff dashboards between their start and end dates. Marked “New” for ${NEW_FOR_DAYS} days.`}
                actions={<>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search announcements" className="w-full sm:w-64" />
                    <Button onClick={() => openEditor("new")}><Plus className="h-4 w-4" />New announcement</Button>
                </>}
            />
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-4 py-2.5 md:px-5">
                {FILTERS.map(f => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        aria-pressed={filter === f}
                        className={cn("rounded-full px-3 py-1 text-sm font-medium capitalize transition", filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                    >
                        {f} <span className="tabular-nums opacity-70">{counts[f]}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 md:p-5">
                {loading ? <LoadingRow /> : shown.length === 0 ? (
                    <EmptyState
                        icon={Megaphone}
                        title={items.length ? "Nothing here" : "No announcements yet"}
                        hint={items.length ? undefined : "Post a notice for students and staff. You can schedule it for a later date."}
                        action={items.length ? undefined : <Button onClick={() => openEditor("new")}><Plus className="h-4 w-4" />New announcement</Button>}
                    />
                ) : (
                    <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                        {shown.map(a => {
                            const status = announcementStatus(a, now)
                            return (
                                <li key={a.id} className={cn(
                                    "flex flex-col rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm",
                                    status === "live" ? "border-l-emerald-500" : status === "scheduled" ? "border-l-blue-500" : "border-l-slate-300 opacity-80",
                                )}>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-base font-semibold text-slate-900">{a.title}</h3>
                                        <div className="flex shrink-0 items-center gap-1">
                                            {isNewAnnouncement(a, now) && <NewBadge />}
                                            <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
                                        </div>
                                    </div>
                                    <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{a.content}</p>
                                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <CalendarRange className="h-3.5 w-3.5" />
                                            {day(a.startsAt)} → {a.endsAt ? day(a.endsAt) : "no end"}
                                            {a.author?.name ? ` · ${a.author.name}` : ""}
                                        </span>
                                        <span className="flex gap-1">
                                            <Button variant="outline" size="sm" className="h-7" onClick={() => openEditor(a)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                                            <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => setDeleting(a)} aria-label={`Delete ${a.title}`} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </span>
                                    </div>
                                    {status === "expired" && <p className="mt-2 text-xs text-slate-500">Hidden from the site since its end date. Edit the dates to show it again.</p>}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <AnnouncementDialog open={editing !== null} announcement={editing === "new" ? null : editing} now={now} onClose={() => setEditing(null)} onSaved={load} />
            <ConfirmDialog
                open={!!deleting}
                title={`Delete “${deleting?.title}”?`}
                description={<p>It disappears from every dashboard straight away. This can&apos;t be undone.</p>}
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/announcements/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await load()
                    return null
                }}
            />
        </Panel>
    )
}

function AnnouncementDialog({ open, announcement, now, onClose, onSaved }: {
    /** The time the dialog was opened, for working out whether dates are past. */
    open: boolean; announcement: Announcement | null; now: number; onClose: () => void; onSaved: () => Promise<void>
}) {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [start, setStart] = useState("")
    const [end, setEnd] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    const key = open ? (announcement?.id ?? "new") : null
    const [lastKey, setLastKey] = useState<string | null>(null)
    if (key !== lastKey) {
        setLastKey(key)
        const today = new Date()
        const week = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
        setTitle(announcement?.title ?? "")
        setContent(announcement?.content ?? "")
        setStart(announcement ? toDayInput(announcement.startsAt) : toDayInput(today))
        setEnd(announcement?.endsAt ? toDayInput(announcement.endsAt) : toDayInput(week))
        setError("")
    }

    // What will happen with these dates
    const preview = (() => {
        if (!start || !end) return null
        const s = dayStart(start), e = dayEnd(end)
        if (e <= s) return { ok: false, text: "The end date must be on or after the start date." }
        if (e.getTime() <= now) return { ok: false, text: "The end date is already past, so it would never show." }
        const days = Math.round((e.getTime() - s.getTime()) / 86_400_000)
        if (s.getTime() > now) return { ok: true, text: `Scheduled: it appears on ${day(s.toISOString())} and stays up for ${days} day${days === 1 ? "" : "s"}.` }
        return { ok: true, text: `Goes live now and is removed from the site after ${day(e.toISOString())}.` }
    })()

    const save = async () => {
        if (!title.trim() || !content.trim()) return setError("Add a title and a message")
        if (!start || !end) return setError("Choose a start and an end date")
        if (preview && !preview.ok && !announcement) return setError(preview.text)
        setBusy(true)
        // The start date counts from the beginning of that day (or now, for today), the end date to its last moment.
        const s = dayStart(start)
        const startsAt = announcement && toDayInput(announcement.startsAt) === start
            ? announcement.startsAt // unchanged day: keep the original time, so "New" isn't reset
            : (s.getTime() < Date.now() ? new Date() : s).toISOString()
        const body = { title, content, startsAt, endsAt: dayEnd(end).toISOString() }
        const res = announcement ? await send(`/api/announcements/${announcement.id}`, "PATCH", body) : await send("/api/announcements", "POST", body)
        if (!res?.ok) { setBusy(false); return setError(await readError(res)) }
        await onSaved()
        setBusy(false)
        onClose()
    }

    return (
        <FormDialog
            open={open}
            wide
            title={announcement ? "Edit announcement" : "New announcement"}
            description="Students and staff see it on their dashboards between the start and end dates."
            onClose={onClose}
            onSubmit={save}
            busy={busy}
            error={error}
            submitLabel={announcement ? "Save changes" : start && dayStart(start).getTime() > now ? "Schedule announcement" : "Publish announcement"}
        >
            <Field label="Title" htmlFor="a-title">
                <Input id="a-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mock test schedule changed" maxLength={200} autoFocus />
            </Field>
            <Field label="Message" htmlFor="a-content">
                <Textarea id="a-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Write the details students need…" className="min-h-32" maxLength={5000} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date" htmlFor="a-start" hint="Pick a future date to schedule it.">
                    <Input id="a-start" type="date" value={start} onChange={e => { setStart(e.target.value); if (end && e.target.value > end) setEnd(e.target.value) }} required />
                </Field>
                <Field label="End date" htmlFor="a-end" hint="It's removed from the site after this day.">
                    <Input id="a-end" type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} required />
                </Field>
            </div>
            {preview && (
                <p className={cn("rounded-md px-3 py-2 text-sm", preview.ok ? "bg-indigo-50 text-indigo-800" : "bg-amber-50 text-amber-900")}>{preview.text}</p>
            )}
        </FormDialog>
    )
}
