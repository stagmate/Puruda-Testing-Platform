"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    GraduationCap, Layers, BookMarked, UserCheck, Users, Plus, Pencil, Trash2, ListTree, UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BatchStudents } from "@/components/batch-students"
import { ChaptersDialog } from "@/components/admin/chapters-dialog"
import {
    Badge, ConfirmDialog, DataTable, EmptyState, Field, FormDialog, LoadingRow, Panel, PanelHeader, SearchInput,
    getJson, plural, readError, send,
} from "@/components/admin/kit"

type Course = { id: string; name: string; batches: { id: string; name: string }[]; _count?: { batches: number; tests: number; questions: number } }
type Batch = { id: string; name: string; courseId: string; course?: { name: string } | null; _count?: { students: number; tests: number; assignments: number } }
type Subject = { id: string; name: string; _count?: { chapters: number; questions: number } }
type Teacher = { id: string; name: string | null; email: string }
type Assignment = {
    id: string; teacherId: string; batchId: string; subjectId: string
    teacher: { name: string | null; email: string }
    batch: { name: string; course?: { name: string } | null }
    subject: { name: string }
}

const matches = (q: string, ...parts: (string | null | undefined)[]) => !q || parts.join(" ").toLowerCase().includes(q.trim().toLowerCase())

/** Courses, batches, subjects (with chapters and subtopics), teacher assignments and batch students. */
export function CourseManagement() {
    const [courses, setCourses] = useState<Course[]>([])
    const [batches, setBatches] = useState<Batch[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState("courses")
    const [studentsBatchId, setStudentsBatchId] = useState("")

    const fetchAll = useCallback(() => Promise.all([
        getJson<Course[]>("/api/admin/courses", []),
        getJson<Batch[]>("/api/admin/batches", []),
        getJson<Subject[]>("/api/admin/subjects", []),
        getJson<Assignment[]>("/api/admin/assignments", []),
        getJson<{ data: Teacher[] }>("/api/admin/users?role=TEACHER&limit=100", { data: [] }),
    ]), [])
    const apply = useCallback(([c, b, s, a, t]: Awaited<ReturnType<typeof fetchAll>>) => {
        setCourses(c); setBatches(b); setSubjects(s); setAssignments(a); setTeachers(t.data ?? [])
        setLoading(false)
    }, [])
    const reload = useCallback(() => fetchAll().then(apply), [fetchAll, apply])

    useEffect(() => { fetchAll().then(apply) }, [fetchAll, apply])

    const openStudents = (batchId: string) => { setStudentsBatchId(batchId); setTab("students") }

    const tabs = [
        { value: "courses", label: "Courses", icon: GraduationCap, count: courses.length },
        { value: "batches", label: "Batches", icon: Layers, count: batches.length },
        { value: "subjects", label: "Subjects", icon: BookMarked, count: subjects.length },
        { value: "assignments", label: "Teacher assignments", icon: UserCheck, count: assignments.length },
        { value: "students", label: "Batch students", icon: Users, count: null },
    ]

    return (
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-slate-200/60 p-1">
                {tabs.map(t => (
                    <TabsTrigger key={t.value} value={t.value} className="flex-none gap-1.5 px-3 py-1.5">
                        <t.icon className="h-4 w-4" />{t.label}
                        {t.count !== null && !loading && <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-600">{t.count}</span>}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="courses"><CoursesTab courses={courses} loading={loading} reload={reload} /></TabsContent>
            <TabsContent value="batches"><BatchesTab batches={batches} courses={courses} loading={loading} reload={reload} onManageStudents={openStudents} /></TabsContent>
            <TabsContent value="subjects"><SubjectsTab subjects={subjects} loading={loading} reload={reload} /></TabsContent>
            <TabsContent value="assignments"><AssignmentsTab assignments={assignments} teachers={teachers} batches={batches} subjects={subjects} loading={loading} reload={reload} /></TabsContent>
            <TabsContent value="students">
                <Panel>
                    <PanelHeader title="Batch students" subtitle="Pick a batch, then add or remove its students." />
                    <div className="p-4 md:p-5"><BatchStudents batchId={studentsBatchId} onBatchChange={setStudentsBatchId} onChanged={reload} /></div>
                </Panel>
            </TabsContent>
        </Tabs>
    )
}

/* ---------------------------------- Courses --------------------------------- */

function CoursesTab({ courses, loading, reload }: { courses: Course[]; loading: boolean; reload: () => Promise<void> }) {
    const [search, setSearch] = useState("")
    const [editing, setEditing] = useState<Course | "new" | null>(null)
    const [deleting, setDeleting] = useState<Course | null>(null)
    const rows = courses.filter(c => matches(search, c.name, ...c.batches.map(b => b.name)))

    return (
        <Panel>
            <PanelHeader
                title="Courses"
                subtitle="A course (e.g. JEE 2027) groups batches, tests and questions."
                actions={<>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search courses" className="w-full sm:w-64" />
                    <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add course</Button>
                </>}
            />
            {loading ? <LoadingRow /> : (
                <DataTable
                    rows={rows}
                    rowKey={c => c.id}
                    empty={<EmptyState icon={GraduationCap} title={search ? "No course matches" : "No courses yet"} hint={search ? undefined : "Add your first course to start creating batches."} />}
                    columns={[
                        { header: "Course", cell: c => <span className="font-semibold text-slate-900">{c.name}</span> },
                        {
                            header: "Batches", cell: c => c.batches.length
                                ? <div className="flex flex-wrap gap-1">{c.batches.map(b => <Badge key={b.id} tone="pink">{b.name}</Badge>)}</div>
                                : <span className="text-slate-400">None</span>,
                        },
                        { header: "Tests", className: "w-24", cell: c => <span className="tabular-nums">{c._count?.tests ?? 0}</span> },
                        { header: "Questions", className: "w-28", cell: c => <span className="tabular-nums">{c._count?.questions ?? 0}</span> },
                        { header: "Actions", className: "w-px text-right", cell: c => <RowActions onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} label={c.name} /> },
                    ]}
                />
            )}

            <NameDialog
                open={editing !== null}
                title={editing === "new" ? "Add course" : "Edit course"}
                label="Course name"
                placeholder="e.g. JEE 2027"
                initial={editing && editing !== "new" ? editing.name : ""}
                onClose={() => setEditing(null)}
                onSave={async name => {
                    const res = editing === "new" ? await send("/api/admin/courses", "POST", { name }) : await send(`/api/admin/courses/${(editing as Course).id}`, "PATCH", { name })
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
            <ConfirmDialog
                open={!!deleting}
                title={`Delete ${deleting?.name}?`}
                description={deleting && (deleting.batches.length
                    ? <p>This course has {plural(deleting.batches.length, "batch", "batches")}. Delete or move them to another course first.</p>
                    : <p>Its {plural(deleting._count?.tests ?? 0, "test")} and {plural(deleting._count?.questions ?? 0, "question")} are kept, without the course tag.</p>)}
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/admin/courses/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
        </Panel>
    )
}

/* ---------------------------------- Batches --------------------------------- */

function BatchesTab({ batches, courses, loading, reload, onManageStudents }: {
    batches: Batch[]; courses: Course[]; loading: boolean; reload: () => Promise<void>; onManageStudents: (id: string) => void
}) {
    const [search, setSearch] = useState("")
    const [courseFilter, setCourseFilter] = useState("all")
    const [editing, setEditing] = useState<Batch | "new" | null>(null)
    const [deleting, setDeleting] = useState<Batch | null>(null)
    const rows = batches.filter(b => (courseFilter === "all" || b.courseId === courseFilter) && matches(search, b.name, b.course?.name))

    return (
        <Panel>
            <PanelHeader
                title="Batches"
                subtitle="Students take tests through the batches they belong to."
                actions={<>
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                        <SelectTrigger className="w-full bg-white sm:w-48" aria-label="Filter by course"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All courses</SelectItem>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search batches" className="w-full sm:w-56" />
                    <Button onClick={() => setEditing("new")} disabled={courses.length === 0} title={courses.length === 0 ? "Add a course first" : undefined}>
                        <Plus className="h-4 w-4" />Add batch
                    </Button>
                </>}
            />
            {loading ? <LoadingRow /> : (
                <DataTable
                    rows={rows}
                    rowKey={b => b.id}
                    empty={<EmptyState icon={Layers} title={batches.length ? "No batch matches" : "No batches yet"} hint={courses.length ? undefined : "Add a course first, then create batches in it."} />}
                    columns={[
                        { header: "Batch", cell: b => <span className="font-semibold text-slate-900">{b.name}</span> },
                        { header: "Course", cell: b => b.course ? <Badge tone="indigo">{b.course.name}</Badge> : <span className="text-slate-400">—</span> },
                        {
                            header: "Students", className: "w-28", cell: b => {
                                const n = b._count?.students ?? 0
                                return <span className={n ? "tabular-nums" : "text-amber-700"}>{n}</span>
                            },
                        },
                        { header: "Tests", className: "w-20", cell: b => <span className="tabular-nums">{b._count?.tests ?? 0}</span> },
                        { header: "Teachers", className: "w-24", cell: b => <span className="tabular-nums">{b._count?.assignments ?? 0}</span> },
                        {
                            header: "Actions", className: "w-px text-right", cell: b => (
                                <div className="flex justify-end gap-1">
                                    <Button variant="outline" size="sm" onClick={() => onManageStudents(b.id)}><UserPlus className="h-3.5 w-3.5" />Students</Button>
                                    <RowActions onEdit={() => setEditing(b)} onDelete={() => setDeleting(b)} label={b.name} />
                                </div>
                            ),
                        },
                    ]}
                />
            )}

            <BatchDialog
                open={editing !== null}
                batch={editing === "new" ? null : editing}
                courses={courses}
                defaultCourseId={courseFilter !== "all" ? courseFilter : ""}
                onClose={() => setEditing(null)}
                onSaved={reload}
            />
            <ConfirmDialog
                open={!!deleting}
                title={`Delete ${deleting?.name}?`}
                description={deleting && <>
                    <p>Its {plural(deleting._count?.students ?? 0, "student")} keep their accounts and results, but leave the batch. Teacher assignments for it are removed.</p>
                    {(deleting._count?.tests ?? 0) > 0 && <p>Published tests given only to this batch are switched to draft, so they don&apos;t open to every student.</p>}
                </>}
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/admin/batches/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
        </Panel>
    )
}

function BatchDialog({ open, batch, courses, defaultCourseId, onClose, onSaved }: {
    open: boolean; batch: Batch | null; courses: Course[]; defaultCourseId: string; onClose: () => void; onSaved: () => Promise<void>
}) {
    const [name, setName] = useState("")
    const [courseId, setCourseId] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    // Reset the form each time the dialog opens
    const key = open ? (batch?.id ?? "new") : null
    const [lastKey, setLastKey] = useState<string | null>(null)
    if (key !== lastKey) {
        setLastKey(key)
        setName(batch?.name ?? "")
        setCourseId(batch?.courseId ?? defaultCourseId)
        setError("")
    }

    const save = async () => {
        if (!name.trim() || !courseId) return setError("Enter a name and choose a course")
        setBusy(true)
        const res = batch ? await send(`/api/admin/batches/${batch.id}`, "PATCH", { name, courseId }) : await send("/api/admin/batches", "POST", { name, courseId })
        if (!res?.ok) { setBusy(false); return setError(await readError(res)) }
        await onSaved()
        setBusy(false)
        onClose()
    }

    return (
        <FormDialog open={open} title={batch ? "Edit batch" : "Add batch"} onClose={onClose} onSubmit={save} busy={busy} error={error} submitLabel={batch ? "Save changes" : "Add batch"}>
            <Field label="Course">
                <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="w-full" aria-label="Course"><SelectValue placeholder="Choose a course" /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
            </Field>
            <Field label="Batch name" htmlFor="batch-name">
                <Input id="batch-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Batch A" autoFocus />
            </Field>
        </FormDialog>
    )
}

/* ---------------------------------- Subjects -------------------------------- */

function SubjectsTab({ subjects, loading, reload }: { subjects: Subject[]; loading: boolean; reload: () => Promise<void> }) {
    const [search, setSearch] = useState("")
    const [editing, setEditing] = useState<Subject | "new" | null>(null)
    const [deleting, setDeleting] = useState<Subject | null>(null)
    const [chaptersOf, setChaptersOf] = useState<Subject | null>(null)
    const rows = subjects.filter(s => matches(search, s.name))

    return (
        <Panel>
            <PanelHeader
                title="Subjects"
                subtitle="Subjects hold chapters, and chapters hold subtopics. Questions are filed under them."
                actions={<>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search subjects" className="w-full sm:w-64" />
                    <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add subject</Button>
                </>}
            />
            {loading ? <LoadingRow /> : (
                <DataTable
                    rows={rows}
                    rowKey={s => s.id}
                    empty={<EmptyState icon={BookMarked} title={subjects.length ? "No subject matches" : "No subjects yet"} />}
                    columns={[
                        { header: "Subject", cell: s => <span className="font-semibold text-slate-900">{s.name}</span> },
                        { header: "Chapters", className: "w-28", cell: s => <span className="tabular-nums">{s._count?.chapters ?? 0}</span> },
                        { header: "Questions", className: "w-28", cell: s => <span className="tabular-nums">{s._count?.questions ?? 0}</span> },
                        {
                            header: "Actions", className: "w-px text-right", cell: s => (
                                <div className="flex justify-end gap-1">
                                    <Button variant="outline" size="sm" onClick={() => setChaptersOf(s)}><ListTree className="h-3.5 w-3.5" />Chapters</Button>
                                    <RowActions onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} label={s.name} />
                                </div>
                            ),
                        },
                    ]}
                />
            )}

            <NameDialog
                open={editing !== null}
                title={editing === "new" ? "Add subject" : "Edit subject"}
                label="Subject name"
                placeholder="e.g. Physics"
                initial={editing && editing !== "new" ? editing.name : ""}
                onClose={() => setEditing(null)}
                onSave={async name => {
                    const res = editing === "new" ? await send("/api/admin/subjects", "POST", { name }) : await send(`/api/admin/subjects/${(editing as Subject).id}`, "PATCH", { name })
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
            <ConfirmDialog
                open={!!deleting}
                title={`Delete ${deleting?.name}?`}
                description={deleting && ((deleting._count?.questions ?? 0) > 0
                    ? <p>{plural(deleting._count!.questions, "question")} use this subject. Move or delete them in the Question Bank first.</p>
                    : <p>Its {plural(deleting._count?.chapters ?? 0, "chapter")}, their subtopics and any teacher assignments for it are deleted too.</p>)}
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/admin/subjects/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
            {chaptersOf && <ChaptersDialog subject={chaptersOf} onClose={() => { setChaptersOf(null); reload() }} />}
        </Panel>
    )
}

/* ---------------------------- Teacher assignments --------------------------- */

function AssignmentsTab({ assignments, teachers, batches, subjects, loading, reload }: {
    assignments: Assignment[]; teachers: Teacher[]; batches: Batch[]; subjects: Subject[]; loading: boolean; reload: () => Promise<void>
}) {
    const [search, setSearch] = useState("")
    const [editing, setEditing] = useState<Assignment | "new" | null>(null)
    const [deleting, setDeleting] = useState<Assignment | null>(null)
    const rows = assignments.filter(a => matches(search, a.teacher.name, a.teacher.email, a.subject.name, a.batch.name, a.batch.course?.name))

    return (
        <Panel>
            <PanelHeader
                title="Teacher assignments"
                subtitle="Which teacher teaches which subject to which batch."
                actions={<>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search teacher, subject or batch" className="w-full sm:w-72" />
                    <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Assign teacher</Button>
                </>}
            />
            {loading ? <LoadingRow /> : (
                <DataTable
                    rows={rows}
                    rowKey={a => a.id}
                    empty={<EmptyState icon={UserCheck} title={assignments.length ? "No assignment matches" : "No teachers assigned yet"} hint={teachers.length ? undefined : "Create teacher accounts under Users first."} />}
                    columns={[
                        {
                            header: "Teacher", cell: a => (
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900">{a.teacher.name || "—"}</p>
                                    <p className="text-xs text-slate-500">{a.teacher.email}</p>
                                </div>
                            ),
                        },
                        { header: "Subject", cell: a => <Badge tone="blue">{a.subject.name}</Badge> },
                        { header: "Batch", cell: a => <span className="font-medium">{a.batch.name}</span> },
                        { header: "Course", cell: a => a.batch.course ? <Badge tone="indigo">{a.batch.course.name}</Badge> : <span className="text-slate-400">—</span> },
                        { header: "Actions", className: "w-px text-right", cell: a => <RowActions onEdit={() => setEditing(a)} onDelete={() => setDeleting(a)} label={`${a.teacher.name} assignment`} /> },
                    ]}
                />
            )}

            <AssignmentDialog
                open={editing !== null}
                assignment={editing === "new" ? null : editing}
                teachers={teachers}
                batches={batches}
                subjects={subjects}
                onClose={() => setEditing(null)}
                onSaved={reload}
            />
            <ConfirmDialog
                open={!!deleting}
                title="Remove this assignment?"
                description={deleting && <p>{deleting.teacher.name || deleting.teacher.email} will no longer be listed for {deleting.subject.name} in {deleting.batch.name}.</p>}
                confirmLabel="Remove"
                onClose={() => setDeleting(null)}
                onConfirm={async () => {
                    const res = await send(`/api/admin/assignments/${deleting!.id}`, "DELETE")
                    if (!res?.ok) return readError(res)
                    await reload()
                    return null
                }}
            />
        </Panel>
    )
}

function AssignmentDialog({ open, assignment, teachers, batches, subjects, onClose, onSaved }: {
    open: boolean; assignment: Assignment | null; teachers: Teacher[]; batches: Batch[]; subjects: Subject[]; onClose: () => void; onSaved: () => Promise<void>
}) {
    const [form, setForm] = useState({ teacherId: "", batchId: "", subjectId: "" })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    const key = open ? (assignment?.id ?? "new") : null
    const [lastKey, setLastKey] = useState<string | null>(null)
    if (key !== lastKey) {
        setLastKey(key)
        setForm(assignment ? { teacherId: assignment.teacherId, batchId: assignment.batchId, subjectId: assignment.subjectId } : { teacherId: "", batchId: "", subjectId: "" })
        setError("")
    }

    const save = async () => {
        if (!form.teacherId || !form.batchId || !form.subjectId) return setError("Choose a teacher, batch and subject")
        setBusy(true)
        const res = assignment ? await send(`/api/admin/assignments/${assignment.id}`, "PATCH", form) : await send("/api/admin/assignments", "POST", form)
        if (!res?.ok) { setBusy(false); return setError(await readError(res)) }
        await onSaved()
        setBusy(false)
        onClose()
    }

    const pick = (label: string, key: keyof typeof form, items: { id: string; name: string }[]) => (
        <Field label={label}>
            <Select value={form[key]} onValueChange={v => setForm(f => ({ ...f, [key]: v }))}>
                <SelectTrigger className="w-full" aria-label={label}><SelectValue placeholder={`Choose a ${label.toLowerCase()}`} /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
        </Field>
    )

    return (
        <FormDialog open={open} title={assignment ? "Edit assignment" : "Assign a teacher"} onClose={onClose} onSubmit={save} busy={busy} error={error} submitLabel={assignment ? "Save changes" : "Assign"}>
            {pick("Teacher", "teacherId", teachers.map(t => ({ id: t.id, name: t.name ? `${t.name} (${t.email})` : t.email })))}
            {pick("Subject", "subjectId", subjects)}
            {pick("Batch", "batchId", batches.map(b => ({ id: b.id, name: b.course ? `${b.name} · ${b.course.name}` : b.name })))}
        </FormDialog>
    )
}

/* ---------------------------------- Shared ---------------------------------- */

function RowActions({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) {
    return (
        <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${label}`} title="Edit"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${label}`} title="Delete" className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
        </div>
    )
}

/** Add/rename dialog for anything with just a name. onSave returns an error, or null when saved. */
export function NameDialog({ open, title, label, placeholder, initial, onClose, onSave }: {
    open: boolean; title: string; label: string; placeholder?: string; initial: string; onClose: () => void; onSave: (name: string) => Promise<string | null>
}) {
    const [name, setName] = useState(initial)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const key = useMemo(() => (open ? `${title}:${initial}` : null), [open, title, initial])
    const [lastKey, setLastKey] = useState<string | null>(null)
    if (key !== lastKey) { setLastKey(key); setName(initial); setError("") }

    const save = async () => {
        if (!name.trim()) return setError("Enter a name")
        setBusy(true)
        const err = await onSave(name.trim())
        setBusy(false)
        if (err) setError(err)
        else onClose()
    }

    return (
        <FormDialog open={open} title={title} onClose={onClose} onSubmit={save} busy={busy} error={error} submitLabel={initial ? "Save changes" : "Add"}>
            <Field label={label} htmlFor="name-dialog-input">
                <Input id="name-dialog-input" value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} autoFocus />
            </Field>
        </FormDialog>
    )
}
