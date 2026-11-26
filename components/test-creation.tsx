"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ListChecks, PenTool, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TestList, testStatus, type ManagedTest, type ReleaseBatch } from "@/components/test-manager"
import { TestBuilder } from "@/components/tests/test-builder"
import { EmptyState, LoadingRow, Panel, PanelHeader, SearchInput, getJson } from "@/components/admin/kit"
import { cn } from "@/lib/utils"

const STATUSES = ["All", "Live", "Scheduled", "Draft", "Closed"] as const

/** Tests: a list of every test, and a separate tab to build a new one. */
export function TestCreation() {
    const [tab, setTab] = useState("list")
    const [tests, setTests] = useState<ManagedTest[]>([])
    const [batches, setBatches] = useState<ReleaseBatch[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState<(typeof STATUSES)[number]>("All")
    const { data: session } = useSession()
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN"

    const fetchAll = useCallback(() => Promise.all([getJson<ManagedTest[]>("/api/admin/tests", []), getJson<ReleaseBatch[]>("/api/admin/batches", [])]), [])
    const apply = useCallback(([t, b]: [ManagedTest[], ReleaseBatch[]]) => { setTests(t); setBatches(b); setLoading(false) }, [])
    const reload = useCallback(() => fetchAll().then(apply), [fetchAll, apply])
    useEffect(() => { fetchAll().then(apply) }, [fetchAll, apply])

    const counts = useMemo(() => {
        const c: Record<string, number> = { All: tests.length }
        for (const t of tests) { const s = testStatus(t).label; c[s] = (c[s] ?? 0) + 1 }
        return c
    }, [tests])

    const q = search.trim().toLowerCase()
    const shown = tests.filter(t =>
        (status === "All" || testStatus(t).label === status) &&
        (!q || [t.title, t.course?.name, ...t.batches.map(b => b.name)].join(" ").toLowerCase().includes(q)))

    return (
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList className="h-auto w-full justify-start gap-1 bg-slate-200/60 p-1 sm:w-auto">
                <TabsTrigger value="list" className="flex-none gap-1.5 px-4 py-1.5"><ListChecks className="h-4 w-4" />All tests
                    {!loading && <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-600">{tests.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="create" className="flex-none gap-1.5 px-4 py-1.5"><Plus className="h-4 w-4" />Create test</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
                <Panel>
                    <PanelHeader
                        title="Tests"
                        subtitle="Publish, schedule, release results, print or preview each test."
                        actions={<>
                            <SearchInput value={search} onChange={setSearch} placeholder="Search title, course or batch" className="w-full sm:w-72" />
                            <Button onClick={() => setTab("create")}><Plus className="h-4 w-4" />Create test</Button>
                        </>}
                    />
                    <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-4 py-2.5 md:px-5">
                        {STATUSES.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatus(s)}
                                aria-pressed={status === s}
                                className={cn("rounded-full px-3 py-1 text-sm font-medium transition", status === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                            >
                                {s} <span className="tabular-nums opacity-70">{counts[s] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 md:p-5">
                        {loading ? <LoadingRow /> : shown.length === 0 ? (
                            <EmptyState
                                icon={PenTool}
                                title={tests.length ? "No test matches" : "No tests yet"}
                                hint={tests.length ? undefined : "Build your first test from the question bank."}
                                action={tests.length ? undefined : <Button onClick={() => setTab("create")}><Plus className="h-4 w-4" />Create test</Button>}
                            />
                        ) : (
                            <TestList tests={shown} batches={batches} onChanged={reload} canDelete={isAdmin} />
                        )}
                    </div>
                </Panel>
            </TabsContent>

            {/* Kept mounted so a half-built test survives switching tabs. */}
            <TabsContent value="create" forceMount className="data-[state=inactive]:hidden">
                <TestBuilder onCreated={reload} />
            </TabsContent>
        </Tabs>
    )
}
