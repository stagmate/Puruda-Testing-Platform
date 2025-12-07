"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function QuestionBankManagement() {
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [questions, setQuestions] = useState<any[]>([])
    const [chapters, setChapters] = useState<any[]>([])
    const [subtopics, setSubtopics] = useState<any[]>([])

    // Filters / Selection
    const [selectedCourse, setSelectedCourse] = useState("")
    const [selectedBatch, setSelectedBatch] = useState("")
    const [selectedSubject, setSelectedSubject] = useState("")
    const [selectedChapter, setSelectedChapter] = useState("")
    const [selectedSubtopic, setSelectedSubtopic] = useState("")
    const [selectedDifficulty, setSelectedDifficulty] = useState("")

    // Single Question Form
    const [newQuestion, setNewQuestion] = useState({
        text: "",
        optionA: "", optionB: "", optionC: "", optionD: "",
        correct: "" as string | string[], // Can be array for MSQ
        difficulty: "BEGINNER",
        type: "SINGLE"
    })

    // Image States
    const [qImage, setQImage] = useState<File | null>(null)
    const [optAImage, setOptAImage] = useState<File | null>(null)
    const [optBImage, setOptBImage] = useState<File | null>(null)
    const [optCImage, setOptCImage] = useState<File | null>(null)
    const [optDImage, setOptDImage] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
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

    const fetchChapters = async () => {
        if (!selectedSubject) {
            setChapters([]); setSelectedChapter(""); setSelectedSubtopic(""); return
        }
        const res = await fetch(`/api/admin/chapters?subjectId=${selectedSubject}`)
        if (res.ok) setChapters(await res.json())
    }

    const fetchSubtopics = async () => {
        if (!selectedChapter) {
            setSubtopics([]); setSelectedSubtopic(""); return
        }
        const res = await fetch(`/api/admin/subtopics?chapterId=${selectedChapter}`)
        if (res.ok) setSubtopics(await res.json())
    }

    const fetchQuestions = async () => {
        const params = new URLSearchParams()
        if (selectedCourse) params.append("courseId", selectedCourse)
        if (selectedBatch) params.append("batchId", selectedBatch)
        if (selectedSubject) params.append("subjectId", selectedSubject)
        if (selectedChapter) params.append("chapterId", selectedChapter)
        if (selectedSubtopic) params.append("subtopicId", selectedSubtopic)
        if (selectedDifficulty) params.append("difficulty", selectedDifficulty)

        const res = await fetch(`/api/admin/questions?${params.toString()}`)
        if (res.ok) {
            const { data } = await res.json()
            setQuestions(data || [])
        }
    }

    useEffect(() => { fetchMetadata() }, [])
    useEffect(() => { fetchChapters() }, [selectedSubject])
    useEffect(() => { fetchSubtopics() }, [selectedChapter])
    useEffect(() => { fetchQuestions() }, [selectedCourse, selectedBatch, selectedSubject, selectedChapter, selectedSubtopic, selectedDifficulty])

    // Helpers (uploadImage removed for brevity as it is unchanged)
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
        } catch (e) { console.error("Upload failed", e) }
        return null
    }

    // Handlers
    const handleSingleAdd = async () => {
        if (!newQuestion.text || !newQuestion.correct || !selectedSubject) {
            alert("Please fill all fields and select a Subject context")
            return
        }

        if (newQuestion.type === 'MULTIPLE' && Array.isArray(newQuestion.correct) && newQuestion.correct.length === 0) {
            alert("Please select at least one correct option")
            return
        }

        setIsUploading(true)

        const [qUrl, aUrl, bUrl, cUrl, dUrl] = await Promise.all([
            uploadImage(qImage), uploadImage(optAImage), uploadImage(optBImage), uploadImage(optCImage), uploadImage(optDImage)
        ])

        // Resolve correct answer value(s) to actual content if using A/B/C/D mapping
        // Logic: If user selects "Option A", we send the Content of Option A.
        // Actually, schema expects the content string.
        const getOptionContent = (key: string) => {
            if (key === 'Option A') return newQuestion.optionA
            if (key === 'Option B') return newQuestion.optionB
            if (key === 'Option C') return newQuestion.optionC
            if (key === 'Option D') return newQuestion.optionD
            return key // integer or direct value
        }

        let finalCorrect = newQuestion.correct;
        if (newQuestion.type === 'SINGLE') {
            finalCorrect = getOptionContent(newQuestion.correct as string)
        } else if (newQuestion.type === 'MULTIPLE') {
            finalCorrect = (newQuestion.correct as string[]).map(k => getOptionContent(k))
        }

        const payload = {
            text: newQuestion.text,
            imageUrl: qUrl,
            options: [newQuestion.optionA, newQuestion.optionB, newQuestion.optionC, newQuestion.optionD],
            optionImages: [aUrl, bUrl, cUrl, dUrl],
            correct: finalCorrect,
            courseId: selectedCourse || null,
            batchId: selectedBatch || null,
            subjectId: selectedSubject,
            chapterId: selectedChapter || null,
            subtopicId: selectedSubtopic || null,
            difficulty: newQuestion.difficulty,
            type: newQuestion.type
        }

        const res = await fetch("/api/admin/questions", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        setIsUploading(false)

        if (res.ok) {
            setNewQuestion({ ...newQuestion, text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" })
            setQImage(null); setOptAImage(null); setOptBImage(null); setOptCImage(null); setOptDImage(null)
            fetchQuestions()
            alert("Question Added!")
        }
    }

    const handleBulkUpload = async () => {
        // ... (bulk upload implementation remains similar but ideally should support new fields in CSV)
        if (!csvFile || !selectedSubject) {
            alert("Please select a valid CSV file and ensure Subject is selected")
            return
        }
        // Simplified for brevity, same logic as before
        alert("Bulk upload not yet updated for Chapter/Subtopic via CSV. Please add single question.")
    }

    const toggleCorrectOption = (opt: string) => {
        const current = Array.isArray(newQuestion.correct) ? newQuestion.correct : []
        if (current.includes(opt)) {
            setNewQuestion({ ...newQuestion, correct: current.filter(c => c !== opt) })
        } else {
            setNewQuestion({ ...newQuestion, correct: [...current, opt] })
        }
    }

    // ... (existing state) ...
    const [isCreating, setIsCreating] = useState(false)
    const [creationType, setCreationType] = useState<"SUBJECT" | "CHAPTER" | "SUBTOPIC" | null>(null)
    const [creationName, setCreationName] = useState("")

    // Bulk Upload State
    const [isBulkUploading, setIsBulkUploading] = useState(false)

    // PDF Import State
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [isParsing, setIsParsing] = useState(false)
    const [parsedQuestions, setParsedQuestions] = useState<any[]>([])

    // ... (existing fetch functions) ...

    // Hierarchy Creation Handlers
    const handleCreateHierarchy = async () => {
        if (!creationName) return
        setIsCreating(true)

        let url = ""
        let body = {}

        if (creationType === "SUBJECT") {
            url = "/api/admin/subjects"
            body = { name: creationName }
        } else if (creationType === "CHAPTER") {
            if (!selectedSubject) { alert("Select a Subject first"); setIsCreating(false); return }
            url = "/api/admin/chapters"
            body = { name: creationName, subjectId: selectedSubject }
        } else if (creationType === "SUBTOPIC") {
            if (!selectedChapter) { alert("Select a Chapter first"); setIsCreating(false); return }
            url = "/api/admin/subtopics"
            body = { name: creationName, chapterId: selectedChapter }
        }

        const res = await fetch(url, { method: "POST", body: JSON.stringify(body) })
        if (res.ok) {
            alert(`${creationType} Created!`)
            setCreationName("")
            setCreationType(null)
            fetchMetadata() // Refresh all metadata to show new items
            if (creationType === "SUBJECT") { /* Auto-refresh done by fetchMetadata */ }
            if (creationType === "CHAPTER") fetchChapters()
            if (creationType === "SUBTOPIC") fetchSubtopics()
        } else {
            alert("Failed to create")
        }
        setIsCreating(false)
    }

    const openCreationDialog = (type: "SUBJECT" | "CHAPTER" | "SUBTOPIC") => {
        setCreationType(type)
        setCreationName("")
    }

    // Bulk Upload Handler
    const handleBulkUploadFull = async () => {
        if (!csvFile || !selectedSubject) {
            alert("Please select a valid CSV file and ensure at least a Subject is selected.")
            return
        }

        setIsBulkUploading(true)
        const reader = new FileReader()
        reader.onload = async (e) => {
            const text = e.target?.result as string
            const rows = text.split("\n").slice(1) // Skip header
            const questions = rows.map(row => {
                // Simple CSV parse (handling commas inside quotes is tricky, simple split for now)
                // Format: Text, OptionA, OptionB, OptionC, OptionD, Correct, Diff, Type
                const cols = row.split(",")
                if (cols.length < 6) return null
                return {
                    text: cols[0]?.trim(),
                    optionA: cols[1]?.trim(),
                    optionB: cols[2]?.trim(),
                    optionC: cols[3]?.trim(),
                    optionD: cols[4]?.trim(),
                    correct: cols[5]?.trim(),
                    difficulty: cols[6]?.trim() || "INTERMEDIATE",
                    type: cols[7]?.trim() || "SINGLE"
                }
            }).filter(q => q && q.text)

            const context = {
                courseId: selectedCourse,
                subjectId: selectedSubject,
                chapterId: selectedChapter,
                subtopicId: selectedSubtopic
            }

            const res = await fetch("/api/admin/questions/bulk", {
                method: "POST",
                body: JSON.stringify({ questions, context })
            })

            if (res.ok) {
                const data = await res.json()
                alert(`Successfully uploaded ${data.count} questions!`)
                setCsvFile(null)
                fetchQuestions()
            } else {
                alert("Bulk upload failed. Check console.")
            }
            setIsBulkUploading(false)
        }
        reader.readAsText(csvFile)
        reader.readAsText(csvFile)
    }

    // PDF Handlers
    const handlePdfUpload = async () => {
        if (!pdfFile) return
        setIsParsing(true)
        const formData = new FormData()
        formData.append("file", pdfFile)

        try {
            const res = await fetch("/api/admin/questions/upload-pdf", {
                method: "POST",
                body: formData
            })
            if (res.ok) {
                const data = await res.json()
                setParsedQuestions(data)
                alert(`Successfully parsed ${data.length} questions! Please review and save.`)
            } else {
                const errData = await res.json().catch(() => ({}))
                alert(`Failed to parse PDF: ${errData.error || "Unknown Error"}`)
            }
        } catch (e: any) {
            console.error(e)
            alert(`Error uploading PDF: ${e.message}`)
        }
        setIsParsing(false)
    }

    const handleSaveParsedQuestions = async () => {
        if (parsedQuestions.length === 0 || !selectedSubject) {
            alert("No questions to save or no Subject selected")
            return
        }

        const context = {
            courseId: selectedCourse,
            subjectId: selectedSubject,
            chapterId: selectedChapter,
            subtopicId: selectedSubtopic
        }

        const res = await fetch("/api/admin/questions/bulk", {
            method: "POST",
            body: JSON.stringify({ questions: parsedQuestions, context })
        })

        if (res.ok) {
            const data = await res.json()
            alert(`Saved ${data.count} questions!`)
            setParsedQuestions([])
            setPdfFile(null)
            fetchQuestions()
        } else {
            alert("Failed to save questions")
        }
    }

    const downloadTemplate = () => {
        const header = "Question Text,Option A,Option B,Option C,Option D,Correct Answer (Text or Option A),Difficulty (BEGINNER/INTERMEDIATE/ADVANCED),Type (SINGLE/MULTIPLE/INTEGER)\n"
        const sample = "What is 2+2?,1,2,3,4,4,BEGINNER,SINGLE"
        const blob = new Blob([header + sample], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "question_template.csv"
        a.click()
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Question Bank Repository</CardTitle>
                <CardDescription>Manage questions by Hierarchy.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Creation Dialog */}
                <Dialog open={!!creationType} onOpenChange={() => setCreationType(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create {creationType}</DialogTitle></DialogHeader>
                        <Input value={creationName} onChange={e => setCreationName(e.target.value)} placeholder={`Enter ${creationType} Name`} />
                        <Button onClick={handleCreateHierarchy} disabled={isCreating}>
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogContent>
                </Dialog>

                {/* Context Selectors */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <Label>Course</Label>
                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                            <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Courses</SelectItem>
                                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label>Subject (Required)</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => openCreationDialog("SUBJECT")}>+</Button>
                    </div>
                    <div>
                        <Label>Batch</Label>
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                            <SelectTrigger><SelectValue placeholder="All Batches" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                {batches.filter(b => !selectedCourse || b.courseId === selectedCourse).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label>Chapter</Label>
                            <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                                <SelectTrigger><SelectValue placeholder="Select Chapter" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Chapters</SelectItem>
                                    {chapters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="icon" disabled={!selectedSubject} onClick={() => openCreationDialog("CHAPTER")}>+</Button>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label>Subtopic</Label>
                            <Select value={selectedSubtopic} onValueChange={setSelectedSubtopic} disabled={!selectedChapter}>
                                <SelectTrigger><SelectValue placeholder="Select Subtopic" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Subtopics</SelectItem>
                                    {subtopics.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="icon" disabled={!selectedChapter} onClick={() => openCreationDialog("SUBTOPIC")}>+</Button>
                    </div>
                    <div>
                        <Label>Difficulty</Label>
                        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                            <SelectTrigger><SelectValue placeholder="Any Difficulty" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any</SelectItem>
                                <SelectItem value="BEGINNER">Beginner</SelectItem>
                                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                <SelectItem value="ADVANCED">Advanced</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Tabs defaultValue="repository">
                    <TabsList className="mb-4">
                        <TabsTrigger value="repository">Repository ({questions.length})</TabsTrigger>
                        <TabsTrigger value="pdf-import">PDF Import (AI)</TabsTrigger>
                        <TabsTrigger value="single">Add Single</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
                    </TabsList>

                    <TabsContent value="repository">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto border p-2 rounded">
                            {questions.length === 0 && <p className="text-muted-foreground text-center py-4">No questions found for this selection.</p>}
                            {questions.map((q, i) => (
                                <div key={q.id} className="p-3 border rounded bg-slate-50 text-sm">
                                    <div className="flex justify-between">
                                        <p className="font-medium">
                                            <span className={`text-[10px] font-bold px-1 rounded mr-2 ${q.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-700' : q.difficulty === 'ADVANCED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {q.difficulty || 'MED'}
                                            </span>
                                            <span className="text-[10px] font-bold px-1 rounded mr-2 bg-slate-200 text-slate-700">{q.type || 'SINGLE'}</span>
                                            {i + 1}. {q.text}
                                        </p>
                                        {q.imageUrl && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Has Image</span>}
                                    </div>
                                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                        <span className="bg-blue-100 text-blue-800 px-1 rounded">{q.subject?.name}</span>
                                        {q.chapter && <span className="bg-purple-100 text-purple-800 px-1 rounded">{q.chapter.name}</span>}
                                        {q.subtopic && <span className="bg-pink-100 text-pink-800 px-1 rounded">{q.subtopic.name}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="pdf-import" className="space-y-4">
                        <div className="p-4 border rounded bg-slate-50 space-y-4">
                            <div>
                                <h3 className="font-medium">AI PDF Question Import</h3>
                                <p className="text-sm text-muted-foreground">Upload a PDF, let AI extract questions, review them, and save.</p>
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Label>Select PDF File</Label>
                                    <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                                </div>
                                <Button onClick={handlePdfUpload} disabled={!pdfFile || isParsing}>
                                    {isParsing ? "AI Parsing..." : "Parse PDF"}
                                </Button>
                            </div>

                            {parsedQuestions.length > 0 && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Parsed Questions ({parsedQuestions.length})</h4>
                                        <Button onClick={handleSaveParsedQuestions} disabled={!selectedSubject}>
                                            Save All to {chapters.find(c => c.id === selectedChapter)?.name || "Subject"}
                                        </Button>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 border p-2 rounded bg-white">
                                        {parsedQuestions.map((q, i) => (
                                            <div key={i} className="p-2 border rounded text-xs">
                                                <p className="font-semibold">{i + 1}. {q.text}</p>
                                                <ul className="pl-4 list-disc text-muted-foreground">
                                                    <li>A: {q.optionA}</li>
                                                    <li>B: {q.optionB}</li>
                                                    <li>C: {q.optionC}</li>
                                                    <li>D: {q.optionD}</li>
                                                </ul>
                                                <p className="mt-1 text-green-600 font-medium">Correct: {q.correct}</p>
                                                {q.solution && (
                                                    <div className="mt-2 p-2 bg-blue-50 rounded text-muted-foreground">
                                                        <span className="font-semibold text-blue-700">Solution:</span> {q.solution}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 mt-2">
                                                    {q.examTag && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">{q.examTag}</span>}
                                                    {q.hasDiagram && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded">Has Diagram</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {!selectedSubject && <p className="text-red-500 text-sm">Please select a Subject at the top to save.</p>}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="single" className="space-y-4">
                        {/* ... (Single Add Form - Unchanged) ... */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Question Type</Label>
                                <Select value={newQuestion.type} onValueChange={v => setNewQuestion({ ...newQuestion, type: v, correct: v === 'MULTIPLE' ? [] : "" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SINGLE">Single Correct (MCQ)</SelectItem>
                                        <SelectItem value="MULTIPLE">Multiple Correct (MSQ)</SelectItem>
                                        <SelectItem value="INTEGER">Integer / Numerical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Difficulty Level</Label>
                                <Select value={newQuestion.difficulty} onValueChange={v => setNewQuestion({ ...newQuestion, difficulty: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BEGINNER">Beginner</SelectItem>
                                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-end mb-2">
                                <p className="text-xs text-muted-foreground">Context is taken from the filters above (Subject → Chapter → Subtopic)</p>
                            </div>
                            <Label>Question Text</Label>
                            <Textarea value={newQuestion.text} onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })} placeholder="Enter question..." />
                            <div className="flex items-center gap-2">
                                <Label className="min-w-[100px]">Image (Optional)</Label>
                                <Input type="file" accept="image/*" onChange={e => setQImage(e.target.files?.[0] || null)} />
                            </div>
                        </div>

                        {newQuestion.type !== 'INTEGER' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Option A</Label>
                                        {newQuestion.type === 'MULTIPLE' && <input type="checkbox" checked={(newQuestion.correct as string[]).includes('Option A')} onChange={() => toggleCorrectOption('Option A')} />}
                                    </div>
                                    <Input placeholder="Option A Content" value={newQuestion.optionA} onChange={e => setNewQuestion({ ...newQuestion, optionA: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Option B</Label>
                                        {newQuestion.type === 'MULTIPLE' && <input type="checkbox" checked={(newQuestion.correct as string[]).includes('Option B')} onChange={() => toggleCorrectOption('Option B')} />}
                                    </div>
                                    <Input placeholder="Option B Content" value={newQuestion.optionB} onChange={e => setNewQuestion({ ...newQuestion, optionB: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Option C</Label>
                                        {newQuestion.type === 'MULTIPLE' && <input type="checkbox" checked={(newQuestion.correct as string[]).includes('Option C')} onChange={() => toggleCorrectOption('Option C')} />}
                                    </div>
                                    <Input placeholder="Option C Content" value={newQuestion.optionC} onChange={e => setNewQuestion({ ...newQuestion, optionC: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Option D</Label>
                                        {newQuestion.type === 'MULTIPLE' && <input type="checkbox" checked={(newQuestion.correct as string[]).includes('Option D')} onChange={() => toggleCorrectOption('Option D')} />}
                                    </div>
                                    <Input placeholder="Option D Content" value={newQuestion.optionD} onChange={e => setNewQuestion({ ...newQuestion, optionD: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Correct Answer</Label>
                            {newQuestion.type === 'SINGLE' && (
                                <Select value={newQuestion.correct as string} onValueChange={v => setNewQuestion({ ...newQuestion, correct: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Correct Option" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Option A">Option A</SelectItem>
                                        <SelectItem value="Option B">Option B</SelectItem>
                                        <SelectItem value="Option C">Option C</SelectItem>
                                        <SelectItem value="Option D">Option D</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            {newQuestion.type === 'INTEGER' && (
                                <Input type="text" placeholder="Enter numeric answer (e.g. 5, 10.5)" value={newQuestion.correct as string} onChange={e => setNewQuestion({ ...newQuestion, correct: e.target.value })} />
                            )}
                            {newQuestion.type === 'MULTIPLE' && (
                                <p className="text-sm text-muted-foreground p-2 bg-slate-100 rounded">
                                    Select correct options using the checkboxes above. Selected: {Array.isArray(newQuestion.correct) ? newQuestion.correct.join(", ") : ""}
                                </p>
                            )}
                        </div>
                        <Button onClick={handleSingleAdd} disabled={!selectedSubject || isUploading}>
                            {isUploading ? "Uploading Images..." : "Add Question to Bank"}
                        </Button>
                    </TabsContent>

                    <TabsContent value="bulk" className="space-y-4">
                        <div className="p-4 border rounded bg-slate-50 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium">Bulk Upload via CSV</h3>
                                    <p className="text-sm text-muted-foreground">Upload questions to the <strong>currently selected Subject/Chapter/Subtopic</strong>.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadTemplate}>Download Template</Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Select CSV File</Label>
                                <Input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
                            </div>

                            <div className="text-sm bg-yellow-50 text-yellow-800 p-2 rounded">
                                <strong>Note:</strong> Ensure your CSV follows the template format. Images are not supported in bulk upload yet.
                            </div>

                            <Button onClick={handleBulkUploadFull} disabled={!csvFile || isBulkUploading || !selectedSubject} className="w-full">
                                {isBulkUploading ? "Processing..." : "Upload Questions"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
