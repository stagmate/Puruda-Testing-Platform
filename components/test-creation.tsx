"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function TestCreation() {
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [tests, setTests] = useState<any[]>([])
    const [availableQuestions, setAvailableQuestions] = useState<any[]>([])

    // Form State
    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState("60")
    const [selectedCourse, setSelectedCourse] = useState("")
    const [selectedBatches, setSelectedBatches] = useState<string[]>([])
    const [creationMode, setCreationMode] = useState("auto") // auto | manual

    // Generator State
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
    const [questionCount, setQuestionCount] = useState("20")
    const [generatedIds, setGeneratedIds] = useState<string[]>([])
    const [isGenerating, setIsGenerating] = useState(false)

    // Manual State
    const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([])
    const [manualFilterSubject, setManualFilterSubject] = useState("")

    // New Question State
    const [isAddingQ, setIsAddingQ] = useState(false)
    const [newQ, setNewQ] = useState({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" })
    const [qImages, setQImages] = useState<{ q?: File, a?: File, b?: File, c?: File, d?: File }>({})

    const fetchMetadata = async () => {
        const [c, b, s, t] = await Promise.all([
            fetch("/api/admin/courses").then(r => r.json()),
            fetch("/api/admin/batches").then(r => r.json()),
            fetch("/api/admin/subjects").then(r => r.json()),
            fetch("/api/admin/tests").then(r => r.json()),
        ])
        setCourses(c || [])
        setBatches(b || [])
        setSubjects(s || [])
        setTests(t || [])
    }

    const fetchQuestions = async () => {
        const params = new URLSearchParams()
        if (selectedCourse) params.append("courseId", selectedCourse)
        if (manualFilterSubject) params.append("subjectId", manualFilterSubject)

        const res = await fetch(`/api/admin/questions?${params.toString()}`)
        if (res.ok) {
            const { data } = await res.json()
            setAvailableQuestions(data || [])
        }
    }

    useEffect(() => { fetchMetadata() }, [])
    useEffect(() => {
        if (creationMode === "manual") fetchQuestions()
    }, [creationMode, selectedCourse, manualFilterSubject])

    const toggleBatch = (id: string) => {
        setSelectedBatches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleSubject = (id: string) => {
        setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleManusalQuestion = (id: string) => {
        setManualSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    // --- Generator Logic ---
    const handleGenerate = async () => {
        setIsGenerating(true)
        const res = await fetch("/api/admin/tests/generate", {
            method: "POST",
            body: JSON.stringify({
                courseId: selectedCourse,
                subjectIds: selectedSubjects,
                count: parseInt(questionCount)
            })
        })
        const data = await res.json()
        if (res.ok) {
            setGeneratedIds(data.questions.map((q: any) => q.id))
            alert(`Generated ${data.count} questions! Review and Save.`)
        } else {
            alert("Error: " + JSON.stringify(data))
        }
        setIsGenerating(false)
    }

    // --- Create Test Logic ---
    // Scheduling State
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [resultMode, setResultMode] = useState("INSTANT")
    const [showRank, setShowRank] = useState(false)

    // ... (rest of state)

    // ... (fetchMetadata etc)

    // --- Create Test Logic ---
    const handleCreateTest = async () => {
        const finalQuestionIds = creationMode === "auto" ? generatedIds : manualSelectedIds

        if (!title || finalQuestionIds.length === 0 || selectedBatches.length === 0) {
            alert("Please fill Title, Select Batches, and Select Questions")
            return
        }

        const res = await fetch("/api/admin/tests", {
            method: "POST",
            body: JSON.stringify({
                title,
                duration,
                type: (selectedSubjects.length > 1 || manualSelectedIds.length > 0) ? "MIXED" : "SUBJECT",
                courseId: selectedCourse,
                batchIds: selectedBatches,
                questionIds: finalQuestionIds,
                startTime: startTime || null,
                endTime: endTime || null,
                resultMode,
                showRank
            })
        })

        if (res.ok) {
            alert("Test Created Successfully!")
            setTitle("")
            setStartTime("")
            setEndTime("")
            setResultMode("INSTANT")
            setShowRank(false)
            setGeneratedIds([])
            setManualSelectedIds([])
            fetchMetadata()
        }
    }

    // --- New Question Logic ---
    const uploadImage = async (file?: File) => {
        if (!file) return null
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (res.ok) return (await res.json()).url
        return null
    }

    const handleQuickAddQuestion = async () => {
        if (!newQ.text || !newQ.correct || !manualFilterSubject) {
            alert("Fill required fields and ensure a Subject filter is active (to tag the question)")
            return
        }
        setIsAddingQ(true)

        const [qUrl, aUrl, bUrl, cUrl, dUrl] = await Promise.all([
            uploadImage(qImages.q), uploadImage(qImages.a), uploadImage(qImages.b), uploadImage(qImages.c), uploadImage(qImages.d)
        ])

        const payload = {
            text: newQ.text,
            imageUrl: qUrl,
            options: [newQ.optionA, newQ.optionB, newQ.optionC, newQ.optionD],
            optionImages: [aUrl, bUrl, cUrl, dUrl],
            correct: newQ.correct,
            courseId: selectedCourse || null,
            subjectId: manualFilterSubject
        }

        const res = await fetch("/api/admin/questions", { method: "POST", body: JSON.stringify(payload) })
        if (res.ok) {
            const savedQ = await res.json()
            setManualSelectedIds(prev => [...prev, savedQ.id]) // Auto-select
            setNewQ({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" })
            setQImages({})
            fetchQuestions() // Refresh list
            alert("Question Added & Selected!")
        }
        setIsAddingQ(false)
    }

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Test Creation & Management</CardTitle>
                <CardDescription>Create Auto-Generated or Manual Tests</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Create Form */}
                    <div className="space-y-4 border-r pr-8">
                        <div className="space-y-2">
                            <Label>Test Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. JEE Mains Mock 1" />
                        </div>

                        {/* Scheduling Section */}
                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-slate-50">
                            <div className="space-y-2">
                                <Label>Start Time (Optional)</Label>
                                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time (Optional)</Label>
                                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Result Mode</Label>
                                <Select value={resultMode} onValueChange={setResultMode}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INSTANT">Instant Release</SelectItem>
                                        <SelectItem value="MANUAL">Manual Release</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end mb-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="showRank" checked={showRank} onCheckedChange={(c) => setShowRank(!!c)} />
                                    <label
                                        htmlFor="showRank"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Show Rank to Students
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (mins)</Label>
                                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Course Scope</Label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                                <SelectContent>
                                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ... Batches & Tabs ... */}
                        <div className="space-y-2">
                            <Label>Assign to Batches</Label>
                            <div className="grid grid-cols-2 gap-2 border p-2 rounded max-h-32 overflow-y-auto">
                                {batches.filter(b => !selectedCourse || b.courseId === selectedCourse).map(b => (
                                    <div key={b.id} className="flex items-center gap-2">
                                        <Checkbox checked={selectedBatches.includes(b.id)} onCheckedChange={() => toggleBatch(b.id)} />
                                        <span className="text-sm">{b.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Tabs value={creationMode} onValueChange={setCreationMode} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="auto">Auto Generator</TabsTrigger>
                                <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                            </TabsList>

                            {/* AUTO MODE */}
                            <TabsContent value="auto" className="space-y-4 border p-4 rounded mt-2">
                                <div className="space-y-2">
                                    <Label>Subjects to Include</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.map(s => (
                                            <Button
                                                key={s.id}
                                                variant={selectedSubjects.includes(s.id) ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => toggleSubject(s.id)}
                                            >
                                                {s.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-4 items-end">
                                    <div className="space-y-2 flex-1">
                                        <Label>Question Count</Label>
                                        <Input type="number" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
                                    </div>
                                    <Button onClick={handleGenerate} disabled={isGenerating || selectedSubjects.length === 0} variant="secondary">
                                        {isGenerating ? "AI Generating..." : "Generate Qs"}
                                    </Button>
                                </div>
                                {generatedIds.length > 0 && (
                                    <p className="text-sm text-green-600 font-medium">{generatedIds.length} questions queued.</p>
                                )}
                            </TabsContent>

                            {/* MANUAL MODE */}
                            <TabsContent value="manual" className="space-y-4 border p-4 rounded mt-2">
                                <div className="flex gap-2">
                                    <Select value={manualFilterSubject} onValueChange={setManualFilterSubject}>
                                        <SelectTrigger><SelectValue placeholder="Filter by Subject" /></SelectTrigger>
                                        <SelectContent>
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    <Dialog>
                                        <DialogTrigger asChild><Button variant="outline" size="icon">+</Button></DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader><DialogTitle>Add New Question</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Question Text</Label>
                                                    <Textarea value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} />
                                                    <Input type="file" onChange={e => setQImages({ ...qImages, q: e.target.files?.[0] })} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['A', 'B', 'C', 'D'].map(opt => (
                                                        <div key={opt}>
                                                            <Input placeholder={`Option ${opt}`} value={(newQ as any)[`option${opt}`]} onChange={e => setNewQ({ ...newQ, [`option${opt}`]: e.target.value })} />
                                                            <Input type="file" className="text-xs" onChange={e => setQImages({ ...qImages, [opt.toLowerCase()]: e.target.files?.[0] })} />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Correct Answer</Label>
                                                    <Input placeholder="Correct Answer Text" value={newQ.correct} onChange={e => setNewQ({ ...newQ, correct: e.target.value })} />
                                                </div>
                                                <Button onClick={handleQuickAddQuestion} disabled={isAddingQ}>{isAddingQ ? "Saving..." : "Save & Select"}</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <div className="h-64 overflow-y-auto border rounded p-2 space-y-2">
                                    {availableQuestions.map(q => (
                                        <div key={q.id} className="flex items-start gap-2 p-2 border-b">
                                            <Checkbox checked={manualSelectedIds.includes(q.id)} onCheckedChange={() => toggleManusalQuestion(q.id)} />
                                            <div className="text-sm">
                                                <p className="font-medium line-clamp-2">{q.text}</p>
                                                {q.imageUrl && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Img</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-right text-muted-foreground">{manualSelectedIds.length} selected</p>
                            </TabsContent>
                        </Tabs>

                        <Button onClick={handleCreateTest} className="w-full mt-4" size="lg">Create & Publish Test</Button>
                    </div>

                    {/* Right: List */}
                    <div>
                        <h3 className="font-semibold mb-4">Active Tests</h3>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {tests.map(t => (
                                <div key={t.id} className="p-3 border rounded hover:bg-slate-50">
                                    <div className="flex justify-between font-medium">
                                        <span>{t.title}</span>
                                        <span className="text-sm text-muted-foreground">{t.duration}m</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {t.course?.name} • {t.batches.map((b: any) => b.name).join(", ")} • {t._count.questions} Qs
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
