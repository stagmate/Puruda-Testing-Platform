"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CourseManagement() {
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [assignments, setAssignments] = useState<any[]>([])
    const [teachers, setTeachers] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    const [enrollments, setEnrollments] = useState<any[]>([])

    // Form States
    const [newCourse, setNewCourse] = useState("")
    const [newBatch, setNewBatch] = useState({ name: "", courseId: "" })
    const [newSubject, setNewSubject] = useState("")
    const [newAssignment, setNewAssignment] = useState({ teacherId: "", batchId: "", subjectId: "" })
    const [newEnrollment, setNewEnrollment] = useState({ studentId: "", batchId: "" })

    // Safe fetch utility
    const safeFetch = async (url: string) => {
        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const json = await res.json()
            // Handle both array and paginated response
            return Array.isArray(json) ? json : (json.data || [])
        } catch (e) {
            console.error(`Failed to fetch ${url}`, e)
            return []
        }
    }

    // Fetch Data
    const refreshData = async () => {
        const [c, b, s, a, u, e] = await Promise.all([
            safeFetch("/api/admin/courses"),
            safeFetch("/api/admin/batches"),
            safeFetch("/api/admin/subjects"),
            safeFetch("/api/admin/assignments"),
            safeFetch("/api/admin/users"),
            safeFetch("/api/admin/enrollments")
        ])

        setCourses(c)
        setBatches(b)
        setSubjects(s)
        setAssignments(a)
        setTeachers(u.filter((user: any) => user.role === "TEACHER"))
        setStudents(u.filter((user: any) => user.role === "STUDENT"))
        setEnrollments(e)
    }

    useEffect(() => { refreshData() }, [])

    // Creation Handlers
    const createCourse = async () => {
        if (!newCourse) return
        await fetch("/api/admin/courses", { method: "POST", body: JSON.stringify({ name: newCourse }) })
        setNewCourse(""); refreshData()
    }

    const createBatch = async () => {
        if (!newBatch.name || !newBatch.courseId) return
        await fetch("/api/admin/batches", { method: "POST", body: JSON.stringify(newBatch) })
        setNewBatch({ name: "", courseId: "" }); refreshData()
    }

    const createSubject = async () => {
        if (!newSubject) return
        await fetch("/api/admin/subjects", { method: "POST", body: JSON.stringify({ name: newSubject }) })
        setNewSubject(""); refreshData()
    }

    const createAssignment = async () => {
        const { teacherId, batchId, subjectId } = newAssignment
        if (!teacherId || !batchId || !subjectId) return
        await fetch("/api/admin/assignments", { method: "POST", body: JSON.stringify(newAssignment) })
        setNewAssignment({ teacherId: "", batchId: "", subjectId: "" }); refreshData()
    }

    const createEnrollment = async () => {
        const { studentId, batchId } = newEnrollment
        if (!studentId || !batchId) return
        await fetch("/api/admin/enrollments", { method: "POST", body: JSON.stringify(newEnrollment) })
        setNewEnrollment({ studentId: "", batchId: "" }); refreshData()
    }

    return (
        <Card>
            <CardHeader><CardTitle>Academic Management</CardTitle></CardHeader>
            <CardContent>
                <Tabs defaultValue="courses">
                    <TabsList className="mb-4">
                        <TabsTrigger value="courses">Courses</TabsTrigger>
                        <TabsTrigger value="batches">Batches</TabsTrigger>
                        <TabsTrigger value="subjects">Subjects</TabsTrigger>
                        <TabsTrigger value="assignments">Assign Teachers</TabsTrigger>
                        <TabsTrigger value="enrollments">Enroll Students</TabsTrigger>
                    </TabsList>

                    {/* COURSES TAB */}
                    <TabsContent value="courses" className="space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder="New Course Name (e.g. JEE 2026)" value={newCourse} onChange={e => setNewCourse(e.target.value)} />
                            <Button onClick={createCourse}>Add Course</Button>
                        </div>
                        <ul className="list-disc pl-5">
                            {courses.map(c => <li key={c.id}>{c.name} ({c.batches?.length || 0} batches)</li>)}
                        </ul>
                    </TabsContent>

                    {/* BATCHES TAB */}
                    <TabsContent value="batches" className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <div className="space-y-1 min-w-[200px]">
                                <Label>Course</Label>
                                <Select value={newBatch.courseId} onValueChange={v => setNewBatch({ ...newBatch, courseId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                                    <SelectContent>
                                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 flex-1">
                                <Label>Batch Name</Label>
                                <Input value={newBatch.name} onChange={e => setNewBatch({ ...newBatch, name: e.target.value })} placeholder="e.g. Morning Batch" />
                            </div>
                            <Button onClick={createBatch}>Add Batch</Button>
                        </div>
                        <ul className="list-disc pl-5">
                            {batches.map(b => (
                                <li key={b.id}>{b.name} <span className="text-muted-foreground text-sm">({b.course?.name})</span></li>
                            ))}
                        </ul>
                    </TabsContent>

                    {/* SUBJECTS TAB */}
                    <TabsContent value="subjects" className="space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder="Subject Name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                            <Button onClick={createSubject}>Add Subject</Button>
                        </div>
                        <ul className="list-disc pl-5">
                            {subjects.map(s => <li key={s.id}>{s.name}</li>)}
                        </ul>
                    </TabsContent>

                    {/* ASSIGNMENTS TAB */}
                    <TabsContent value="assignments" className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 border p-4 rounded-lg bg-slate-50">
                            <div className="space-y-1">
                                <Label>Teacher</Label>
                                <Select value={newAssignment.teacherId} onValueChange={v => setNewAssignment({ ...newAssignment, teacherId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Batch</Label>
                                <Select value={newAssignment.batchId} onValueChange={v => setNewAssignment({ ...newAssignment, batchId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                    <SelectContent>
                                        {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Subject</Label>
                                <Select value={newAssignment.subjectId} onValueChange={v => setNewAssignment({ ...newAssignment, subjectId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="col-span-3" onClick={createAssignment}>Assign Teacher to Batch & Subject</Button>
                        </div>

                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Current Assignments</h3>
                            <ul className="list-disc pl-5 text-sm">
                                {assignments.map(a => (
                                    <li key={a.id}>
                                        <b>{a.teacher.name}</b> teaches <b>{a.subject.name}</b> in <b>{a.batch.name}</b> <span className="text-muted-foreground">({a.batch.course?.name})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </TabsContent>

                    {/* ENROLLMENTS TAB */}
                    <TabsContent value="enrollments" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50">
                            <div className="space-y-1">
                                <Label>Student</Label>
                                <Select value={newEnrollment.studentId} onValueChange={v => setNewEnrollment({ ...newEnrollment, studentId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                                    <SelectContent>
                                        {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.email})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Batch</Label>
                                <Select value={newEnrollment.batchId} onValueChange={v => setNewEnrollment({ ...newEnrollment, batchId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                    <SelectContent>
                                        {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="col-span-2" onClick={createEnrollment}>Enroll Student in Batch</Button>
                        </div>

                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Current Enrollments</h3>
                            <ul className="list-disc pl-5 text-sm">
                                {enrollments.map((e: any, i: number) => (
                                    <li key={i}>
                                        <b>{e.studentName}</b> is in <b>{e.batchName}</b> ({e.courseName})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )

}
