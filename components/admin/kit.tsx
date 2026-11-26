"use client"

// Small building blocks shared by the admin sections, so every page has the
// same toolbar, table, empty state and confirm dialog.

import { useState, type ReactNode } from "react"
import { Loader2, Search, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** The message from a failed response: plain text, or { error } JSON. */
export async function readError(res: Response | null | undefined, fallback = "Something went wrong"): Promise<string> {
    if (!res) return "Couldn't reach the server. Check your connection and try again."
    const text = await res.text().catch(() => "")
    try {
        const json = JSON.parse(text)
        if (json && typeof json.error === "string") return json.error
    } catch { /* plain text */ }
    return text || fallback
}

/** fetch + JSON body helper. Returns the response, or null if the network failed. */
export function send(url: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) {
    return fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null)
}

export async function getJson<T>(url: string, fallback: T): Promise<T> {
    try {
        const res = await fetch(url)
        return res.ok ? await res.json() : fallback
    } catch {
        return fallback
    }
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

/** White panel that holds a section's content. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>
}

/** Title row for a panel: heading + count on the left, actions on the right. */
export function PanelHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5", className)}>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
    return (
        <div className={cn("relative", className)}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="bg-white pl-8 pr-8" />
            {value && (
                <button type="button" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Clear search">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <div className="rounded-full bg-slate-100 p-3"><Icon className="h-6 w-6 text-slate-400" /></div>
            <p className="font-medium text-slate-700">{title}</p>
            {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    )
}

export function LoadingRow() {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
}

export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: "slate" | "indigo" | "green" | "amber" | "red" | "blue" | "purple" | "pink" | "orange"; className?: string }) {
    const tones = {
        slate: "bg-slate-100 text-slate-700",
        indigo: "bg-indigo-50 text-indigo-700",
        green: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-800",
        red: "bg-red-50 text-red-700",
        blue: "bg-blue-50 text-blue-700",
        purple: "bg-purple-50 text-purple-700",
        pink: "bg-pink-50 text-pink-700",
        orange: "bg-orange-50 text-orange-700",
    }
    return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>
}

/** Simple, consistent table. Columns render their own cells. */
export function DataTable<T>({ rows, columns, rowKey, empty }: {
    rows: T[]
    columns: { header: string; cell: (row: T) => ReactNode; className?: string }[]
    rowKey: (row: T) => string
    empty?: ReactNode
}) {
    if (rows.length === 0) return <>{empty}</>
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {columns.map(c => <th key={c.header} className={cn("px-4 py-2.5 md:px-5", c.className)}>{c.header}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map(r => (
                        <tr key={rowKey(r)} className="hover:bg-slate-50/70">
                            {columns.map(c => <td key={c.header} className={cn("px-4 py-3 align-middle md:px-5", c.className)}>{c.cell(r)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/** Modal form shell: title, description, body, error, and Cancel / Save buttons. */
export function FormDialog({ open, title, description, onClose, onSubmit, submitLabel = "Save", busy, error, children, wide, submitDisabled }: {
    open: boolean
    title: ReactNode
    description?: ReactNode
    onClose: () => void
    onSubmit: () => void
    submitLabel?: string
    busy?: boolean
    error?: string
    children: ReactNode
    wide?: boolean
    submitDisabled?: boolean
}) {
    return (
        <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose() }}>
            <DialogContent className={cn("max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit() }}>
                    {children}
                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                        <Button type="submit" disabled={busy || submitDisabled}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/** "Are you sure?" dialog for deletes. onConfirm returns an error message, or null when done. */
export function ConfirmDialog({ open, title, description, confirmLabel = "Delete", onClose, onConfirm }: {
    open: boolean
    title: ReactNode
    description?: ReactNode
    confirmLabel?: string
    onClose: () => void
    onConfirm: () => Promise<string | null>
}) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const confirm = async () => {
        setBusy(true)
        setError("")
        const err = await onConfirm()
        setBusy(false)
        if (err) setError(err)
        else onClose()
    }
    return (
        <Dialog open={open} onOpenChange={o => { if (!o && !busy) { setError(""); onClose() } }}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription asChild><div className="space-y-2 text-sm text-slate-600">{description}</div></DialogDescription>}
                </DialogHeader>
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => { setError(""); onClose() }} disabled={busy}>Cancel</Button>
                    <Button variant="destructive" onClick={confirm} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** Label + control stacked, used inside form dialogs. */
export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">{label}</label>
            {children}
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
    )
}

/** Page numbers to show around the current page, with gaps as null. */
function pageList(page: number, total: number): (number | null)[] {
    const set = new Set([1, total, page - 1, page, page + 1].filter(p => p >= 1 && p <= total))
    const sorted = Array.from(set).sort((a, b) => a - b)
    const out: (number | null)[] = []
    sorted.forEach((p, i) => { if (i && p - sorted[i - 1] > 1) out.push(null); out.push(p) })
    return out
}

/**
 * Pagination that sticks to the bottom of the screen while the list scrolls.
 * Leaves room on the right for the floating chat button.
 */
export function PaginationBar({ page, pageSize, total, onPage, onPageSize, sizes = [10, 20, 50], noun = "items", sticky = true }: {
    page: number
    pageSize: number
    total: number
    onPage: (p: number) => void
    onPageSize?: (n: number) => void
    sizes?: number[]
    noun?: string
    sticky?: boolean
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)
    return (
        <div className={cn(
            "flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pr-24 md:px-5 md:pr-24",
            sticky && "sticky bottom-0 z-20 rounded-b-xl shadow-[0_-4px_12px_-6px_rgba(15,23,42,0.12)]",
        )}>
            <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="tabular-nums">{total === 0 ? `No ${noun}` : <>Showing <b className="text-slate-900">{from}–{to}</b> of <b className="text-slate-900">{total}</b> {noun}</>}</span>
                {onPageSize && (
                    <label className="hidden items-center gap-1.5 sm:flex">
                        <span className="text-xs text-slate-500">Per page</span>
                        <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Items per page">
                            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                )}
            </div>
            <nav className="flex items-center gap-1" aria-label="Pagination">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
                <div className="hidden items-center gap-1 sm:flex">
                    {pageList(page, totalPages).map((p, i) => p === null
                        ? <span key={`gap${i}`} className="px-1 text-slate-400">…</span>
                        : <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="min-w-8 px-2 tabular-nums" onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined}>{p}</Button>)}
                </div>
                <span className="px-2 text-sm tabular-nums text-slate-500 sm:hidden">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
            </nav>
        </div>
    )
}
