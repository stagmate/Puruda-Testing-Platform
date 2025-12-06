"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function QuestionBankManagement() {
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [questions, setQuestions] = useState<any[]>([])

    // Filters / Selection
    const [selectedCourse, setSelectedCourse] = useState("")
    const [selectedBatch, setSelectedBatch] = useState("")
    const [selectedSubject, setSelectedSubject] = useState("")

    // Single Question Form
    const [newQuestion, setNewQuestion] = useState({
        text: "",
        optionA: "", optionB: "", optionC: "", optionD: "",
        correct: ""
    })

    // Image States
    const [qImage, setQImage] = useState<File | null>(null)
    const [optAImage, setOptAImage] = useState<File | null>(null)
    const [optBImage, setOptBImage] = useState<File | null>(null)
    const [optCImage, setOptCImage] = useState<File | null>(null)
    const [optDImage, setOptDImage] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Bulk Upload
    const [csvFile, setCsvFile] = useState<File | null>(null)

    // Data Fetching
    const fetchMetadata = async () => {
        const [c, b, s] = await Promise.all([
            fetch("/api/admin/courses").then(r => r.json()),
            fetch("/api/admin/batches").then(r => r.json()),
            fetch("/api/admin/subjects").then(r => r.json()),
        ])
        setCourses(c || [])
        setBatches(b || [])
        setSubjects(s || [])
    }

    const fetchQuestions = async () => {
        const params = new URLSearchParams()
        if (selectedCourse) params.append("courseId", selectedCourse)
        if (selectedBatch) params.append("batchId", selectedBatch)
        if (selectedSubject) params.append("subjectId", selectedSubject)

        const res = await fetch(`/api/admin/questions?${params.toString()}`)
        if (res.ok) {
            const { data } = await res.json()
            setQuestions(data || [])
        }
    }

    useEffect(() => { fetchMetadata() }, [])
    useEffect(() => { fetchQuestions() }, [selectedCourse, selectedBatch, selectedSubject])

    // Helpers
    const uploadImage = async (file: File | null) => {
        if (!file) return null
        const formData = new FormData()
        formData.append("file", file)
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData })
            if (res.ok) {
                const data = await res.json()
                return data.url
            }
        } catch (e) {
            console.error("Upload failed", e)
        }
        return null
    }

    // Handlers
    const handleSingleAdd = async () => {
        if (!newQuestion.text || !newQuestion.correct || !selectedSubject) {
            alert("Please fill all fields and select a Subject context")
            return
        }

        setIsUploading(true)

        // Upload images in parallel
        const [qUrl, aUrl, bUrl, cUrl, dUrl] = await Promise.all([
            uploadImage(qImage),
            uploadImage(optAImage),
            uploadImage(optBImage),
            uploadImage(optCImage),
            uploadImage(optDImage)
        ])

        const payload = {
            text: newQuestion.text,
            imageUrl: qUrl,
            options: [newQuestion.optionA, newQuestion.optionB, newQuestion.optionC, newQuestion.optionD],
            optionImages: [aUrl, bUrl, cUrl, dUrl],
            correct: newQuestion.correct,
            courseId: selectedCourse || null,
            batchId: selectedBatch || null,
            subjectId: selectedSubject
        }

        const res = await fetch("/api/admin/questions", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        setIsUploading(false)

        if (res.ok) {
            setNewQuestion({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" })
            setQImage(null); setOptAImage(null); setOptBImage(null); setOptCImage(null); setOptDImage(null)
            fetchQuestions()
            alert("Question Added!")
        }
    }

    const handleBulkUpload = async () => {
        if (!csvFile || !selectedSubject) {
            alert("Please select a valid CSV file and ensure Subject is selected")
            return
        }

        const text = await csvFile.text()
        const rows = text.split("\n").filter(row => row.trim() !== "")
        // Assume format: Question,OptA,OptB,OptC,OptD,Correct
        const parsedQuestions = rows.slice(1).map(row => {
            const cols = row.split(",")
            if (cols.length < 6) return null
            return {
                text: cols[0],
                options: [cols[1], cols[2], cols[3], cols[4]],
                correct: cols[5].trim()
            }
        }).filter(q => q !== null)

        const payload = {
            questions: parsedQuestions,
            courseId: selectedCourse || null,
            batchId: selectedBatch || null,
            subjectId: selectedSubject
        }

        const res = await fetch("/api/admin/questions/bulk", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        if (res.ok) {
            setCsvFile(null)
            fetchQuestions()
            alert(`Uploaded ${parsedQuestions.length} questions!`)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Question Bank Repository</CardTitle>
                <CardDescription>Manage questions tagged by Course, Batch, and Subject.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Context Selectors */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <Label>Course Filter</Label>
                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                            <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Courses</SelectItem>
                                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Batch Filter</Label>
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                            <SelectTrigger><SelectValue placeholder="All Batches" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                {batches.filter(b => !selectedCourse || b.courseId === selectedCourse).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Subject (Required for Add)</Label>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                            <SelectContent>
                                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Tabs defaultValue="repository">
                    <TabsList className="mb-4">
                        <TabsTrigger value="repository">Repository ({questions.length})</TabsTrigger>
                        <TabsTrigger value="single">Add Single</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
                    </TabsList>

                    <TabsContent value="repository">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto border p-2 rounded">
                            {questions.length === 0 && <p className="text-muted-foreground text-center py-4">No questions found for this selection.</p>}
                            {questions.map((q, i) => (
                                <div key={q.id} className="p-3 border rounded bg-slate-50 text-sm">
                                    <div className="flex justify-between">
                                        <p className="font-medium">{i + 1}. {q.text}</p>
                                        {q.imageUrl && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Has Image</span>}
                                    </div>
                                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                        <span className="bg-blue-100 text-blue-800 px-1 rounded">{q.subject?.name}</span>
                                        {q.course && <span className="bg-green-100 text-green-800 px-1 rounded">{q.course.name}</span>}
                                        {q.batch && <span className="bg-yellow-100 text-yellow-800 px-1 rounded">{q.batch.name}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="single" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Textarea value={newQuestion.text} onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })} placeholder="Enter question..." />
                            <div className="flex items-center gap-2">
                                <Label className="min-w-[100px]">Image (Optional)</Label>
                                <Input type="file" accept="image/*" onChange={e => setQImage(e.target.files?.[0] || null)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Input placeholder="Option A" value={newQuestion.optionA} onChange={e => setNewQuestion({ ...newQuestion, optionA: e.target.value })} />
                                <Input type="file" accept="image/*" onChange={e => setOptAImage(e.target.files?.[0] || null)} className="text-xs" />
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Option B" value={newQuestion.optionB} onChange={e => setNewQuestion({ ...newQuestion, optionB: e.target.value })} />
                                <Input type="file" accept="image/*" onChange={e => setOptBImage(e.target.files?.[0] || null)} className="text-xs" />
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Option C" value={newQuestion.optionC} onChange={e => setNewQuestion({ ...newQuestion, optionC: e.target.value })} />
                                <Input type="file" accept="image/*" onChange={e => setOptCImage(e.target.files?.[0] || null)} className="text-xs" />
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Option D" value={newQuestion.optionD} onChange={e => setNewQuestion({ ...newQuestion, optionD: e.target.value })} />
                                <Input type="file" accept="image/*" onChange={e => setOptDImage(e.target.files?.[0] || null)} className="text-xs" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Correct Answer (Exact Match)</Label>
                            <Input placeholder="e.g. Option A Content" value={newQuestion.correct} onChange={e => setNewQuestion({ ...newQuestion, correct: e.target.value })} />
                        </div>
                        <Button onClick={handleSingleAdd} disabled={!selectedSubject || isUploading}>
                            {isUploading ? "Uploading Images..." : "Add Question to Bank"}
                        </Button>
                    </TabsContent>

                    <TabsContent value="bulk" className="space-y-4">
                        <div className="border-2 border-dashed p-8 text-center rounded-lg">
                            <Input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} className="mx-auto max-w-xs" />
                            <p className="text-sm text-muted-foreground mt-2">Format: Question, OptA, OptB, OptC, OptD, Correct Answer</p>
                        </div>
                        <Button onClick={handleBulkUpload} disabled={!csvFile || !selectedSubject} className="w-full">Upload CSV</Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
