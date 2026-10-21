"use client"

import { useRef, useState } from "react"
import { Download, Loader2, Upload, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { parseQuestionCsv } from "@/lib/question-csv"
import type { QuestionContext } from "@/lib/question-context"

const TEMPLATE =
    "Question Text,Option A,Option B,Option C,Option D,Correct Answer,Difficulty,Type\n" +
    "What is 2+2?,1,2,3,4,D,BEGINNER,SINGLE\n" +
    "Which are noble gases?,He,O_{2},Ne,N_{2},\"A,C\",INTERMEDIATE,MULTIPLE\n" +
    "How many electrons does O^{2-} have?,,,,,10,BEGINNER,INTEGER\n"

export function CsvUpload({ context, contextLabel, onSaved }: { context: QuestionContext; contextLabel: string; onSaved: () => void }) {
    const input = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    const download = () => {
        const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }))
        const a = document.createElement("a")
        a.href = url
        a.download = "question_template.csv"
        a.click()
        URL.revokeObjectURL(url)
    }

    const upload = async () => {
        if (!file) return
        if (!context.subjectId) return setMessage({ ok: false, text: "Choose a subject at the top first." })
        setBusy(true); setMessage(null)
        const questions = parseQuestionCsv(await file.text())
        if (questions.length === 0) {
            setBusy(false)
            return setMessage({ ok: false, text: "No questions found in the CSV. Check it matches the template." })
        }
        const res = await fetch("/api/admin/questions/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questions, context }),
        })
        setBusy(false)
        if (!res.ok) return setMessage({ ok: false, text: await res.text() })
        const { count } = await res.json()
        setMessage({ ok: true, text: `Uploaded ${count} questions to ${contextLabel}.` })
        setFile(null)
        if (input.current) input.current.value = ""
        onSaved()
    }

    return (
        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="font-medium">Upload questions from a CSV</h3>
                    <p className="text-sm text-slate-600">Columns: question, options A–D, correct answer (letter or text; &quot;A,C&quot; for multiple), difficulty, type.</p>
                </div>
                <Button variant="outline" size="sm" onClick={download}><Download className="mr-2 h-4 w-4" />Template</Button>
            </div>
            <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(null) }} />
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => input.current?.click()} className="justify-start"><span className="truncate">{file ? file.name : "Choose CSV…"}</span></Button>
                <Button onClick={upload} disabled={!file || busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload
                </Button>
            </div>
            <p className="text-xs text-slate-500">To add images, use Add question or PDF import, or edit questions after uploading.</p>
            {message && (
                <p className={`whitespace-pre-line rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
                    {message.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}{message.text}
                </p>
            )}
        </div>
    )
}
