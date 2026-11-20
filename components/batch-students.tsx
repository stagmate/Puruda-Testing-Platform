"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Search, UserMinus, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Student = { id: string; name: string | null; email: string }
type BatchRow = { id: string; name: string; course?: { name: string } | null; _count?: { students: number } }

const label = (s: Student) => s.name || s.email
const matches = (s: Student, q: string) => !q || `${s.name ?? ""} ${s.email}`.toLowerCase().includes(q.toLowerCase())

/** Every student account (the users API is paginated). */
async function allStudents(): Promise<Student[]> {
    const out: Student[] = []
    for (let page = 1; page <= 100; page++) {
        const res = await fetch(`/api/admin/users?role=STUDENT&limit=100&page=${page}`)
        if (!res.ok) break
        const { data, meta } = await res.json()
        out.push(...data)
        if (page >= (meta?.totalPages ?? 1)) break
    }
    return out.sort((a, b) => label(a).localeCompare(label(b)))
}

/** Pick a batch, see its students, add or remove students in bulk. */
export function BatchStudents() {
    const [batches, setBatches] = useState<BatchRow[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [batchId, setBatchId] = useState("")
    const [members, setMembers] = useState<Student[]>([])
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
    const [addSearch, setAddSearch] = useState("")
    const [memberSearch, setMemberSearch] = useState("")
    const [toAdd, setToAdd] = useState<Set<string>>(new Set())
    const [toRemove, setToRemove] = useState<Set<string>>(new Set())

    const loadBatches = useCallback(async () => {
        const res = await fetch("/api/admin/batches").catch(() => null)
        if (res?.ok) setBatches(await res.json())
    }, [])

    useEffect(() => {
        fetch("/api/admin/batches").then(r => (r.ok ? r.json() : [])).then(setBatches).catch(() => {})
        allStudents().then(setStudents)
    }, [])

    const loadMembers = useCallback(async (id: string) => {
        setLoading(true)
        const res = await fetch(`/api/admin/batches/${id}/students`).catch(() => null)
        setMembers(res?.ok ? (await res.json()).students : [])
        setLoading(false)
    }, [])

    const choose = (id: string) => {
        setBatchId(id)
        setToAdd(new Set())
        setToRemove(new Set())
        setMessage(null)
        loadMembers(id)
    }

    const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members])
    const candidates = students.filter(s => !memberIds.has(s.id) && matches(s, addSearch))
    const shownMembers = members.filter(m => matches(m, memberSearch))
    const batch = batches.find(b => b.id === batchId)

    const toggle = (set: Set<string>, id: string, on: boolean) => {
        const next = new Set(set)
        if (on) next.add(id)
        else next.delete(id)
        return next
    }

    const change = async (method: "POST" | "DELETE", ids: Set<string>) => {
        if (!batchId || ids.size === 0) return
        setBusy(true)
        setMessage(null)
        const res = await fetch(`/api/admin/batches/${batchId}/students`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentIds: Array.from(ids) }),
        }).catch(() => null)
        setBusy(false)
        if (!res?.ok) return setMessage({ ok: false, text: (await res?.text()) || "Something went wrong" })
        const r = await res.json()
        const n = method === "POST" ? r.added : r.removed
        setMessage({ ok: true, text: `${method === "POST" ? "Added" : "Removed"} ${n} student${n === 1 ? "" : "s"}. ${batch?.name} now has ${r.total}.` })
        setToAdd(new Set())
        setToRemove(new Set())
        loadMembers(batchId)
        loadBatches()
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label>Batch</Label>
                <Select value={batchId} onValueChange={choose}>
                    <SelectTrigger className="w-full sm:max-w-md" aria-label="Batch"><SelectValue placeholder="Choose a batch" /></SelectTrigger>
                    <SelectContent>
                        {batches.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                                {b.name}{b.course ? ` (${b.course.name})` : ""} · {b._count?.students ?? 0} student{b._count?.students === 1 ? "" : "s"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}

            {batchId && (
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Current students */}
                    <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" />In {batch?.name} ({members.length})</h3>
                            <Button variant="outline" size="sm" className="text-red-700" disabled={busy || toRemove.size === 0} onClick={() => change("DELETE", toRemove)}>
                                <UserMinus className="mr-1.5 h-4 w-4" />Remove {toRemove.size || ""}
                            </Button>
                        </div>
                        <SearchBox value={memberSearch} onChange={setMemberSearch} label="Search students in this batch" />
                        <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
                            {loading && <li className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></li>}
                            {!loading && shownMembers.length === 0 && <li className="p-3 text-sm text-slate-500">{members.length ? "No match." : "No students in this batch yet."}</li>}
                            {!loading && shownMembers.map(s => (
                                <StudentRow key={s.id} student={s} checked={toRemove.has(s.id)} onChange={on => setToRemove(t => toggle(t, s.id, on))} />
                            ))}
                        </ul>
                    </div>

                    {/* Add students */}
                    <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 font-medium"><UserPlus className="h-4 w-4" />Add students</h3>
                            <Button size="sm" disabled={busy || toAdd.size === 0} onClick={() => change("POST", toAdd)}>
                                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                                Add {toAdd.size || ""} to {batch?.name}
                            </Button>
                        </div>
                        <SearchBox value={addSearch} onChange={setAddSearch} label="Search students by name or email" />
                        <label className="flex items-center gap-2 px-1 text-sm text-slate-600">
                            <Checkbox
                                checked={candidates.length > 0 && candidates.every(s => toAdd.has(s.id))}
                                onCheckedChange={on => setToAdd(t => {
                                    const next = new Set(t)
                                    for (const s of candidates) { if (on === true) next.add(s.id); else next.delete(s.id) }
                                    return next
                                })}
                                disabled={candidates.length === 0}
                            />
                            Select all {candidates.length} shown
                        </label>
                        <ul className="max-h-80 divide-y overflow-y-auto rounded-md border bg-white">
                            {candidates.length === 0 && <li className="p-3 text-sm text-slate-500">{students.length ? "Every matching student is already in this batch." : "No student accounts yet. Create them under Users."}</li>}
                            {candidates.map(s => (
                                <StudentRow key={s.id} student={s} checked={toAdd.has(s.id)} onChange={on => setToAdd(t => toggle(t, s.id, on))} />
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={value} onChange={e => onChange(e.target.value)} placeholder={label} aria-label={label} className="bg-white pl-8" />
        </div>
    )
}

function StudentRow({ student, checked, onChange }: { student: Student; checked: boolean; onChange: (on: boolean) => void }) {
    return (
        <li>
            <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                <Checkbox checked={checked} onCheckedChange={v => onChange(v === true)} aria-label={label(student)} />
                <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{student.name || "—"}</span>
                    <span className="ml-2 text-slate-500">{student.email}</span>
                </span>
            </label>
        </li>
    )
}
