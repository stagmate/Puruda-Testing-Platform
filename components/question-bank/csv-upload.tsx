"use client"

import { useRef, useState } from "react"
import { Download, Loader2, Upload, CheckCircle2, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    attachPictures, checkQuestions, fileKey, isWebLink, parseQuestionGrid, pictureIndex, readCsvGrid, toBulkRow,
    type SheetQuestion,
} from "@/lib/question-sheet"
import { TEMPLATE_HEADER, TEMPLATE_ROWS } from "@/lib/question-sheet-excel"
import { pool, uploadImage } from "@/lib/pdf-import/browser"
import type { QuestionContext } from "@/lib/question-context"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // same limit as /api/upload
const PICTURE_TYPES: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" }
const isExcel = (f: File) => /\.xlsx$/i.test(f.name)

function saveFile(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

type Status = { ok: boolean; text: string } | null

export function CsvUpload({ context, contextLabel, onSaved }: { context: QuestionContext; contextLabel: string; onSaved: () => void }) {
    const sheetInput = useRef<HTMLInputElement>(null)
    const imageInput = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [images, setImages] = useState<File[]>([])
    const [busy, setBusy] = useState<string | null>(null)
    const [message, setMessage] = useState<Status>(null)

    const downloadCsv = () => {
        const csv = [TEMPLATE_HEADER, ...TEMPLATE_ROWS].map(r => r.map(csvCell).join(",")).join("\n") + "\n"
        saveFile(new Blob([csv], { type: "text/csv" }), "question_template.csv")
    }
    const downloadExcel = async () => {
        const { buildExcelTemplate } = await import("@/lib/question-sheet-excel")
        saveFile(await buildExcelTemplate(), "question_template.xlsx")
    }

    const fail = (lines: string[] | string) => {
        const list = Array.isArray(lines) ? lines : [lines]
        const shown = list.slice(0, 10).join("\n")
        const more = list.length > 10 ? `\n…and ${list.length - 10} more` : ""
        setMessage({ ok: false, text: `Nothing was saved. Fix these first:\n${shown}${more}` })
    }

    const upload = async () => {
        if (!file) return
        if (!context.subjectId) return setMessage({ ok: false, text: "Choose a subject at the top first." })
        setMessage(null)
        setBusy("Reading the sheet…")
        try {
            // 1. Read the sheet into rows (and pictures, for Excel).
            let questions: SheetQuestion[]
            let pictures: { data: Uint8Array; extension: string }[] = []
            const problems: string[] = []
            if (isExcel(file)) {
                const { readExcelSheet } = await import("@/lib/question-sheet-excel")
                const sheet = await readExcelSheet(await file.arrayBuffer())
                const parsed = parseQuestionGrid(sheet.grid, sheet.links)
                problems.push(...attachPictures(parsed, sheet.pictures))
                questions = parsed.questions
                pictures = sheet.pictures
            } else {
                questions = parseQuestionGrid(readCsvGrid(await file.text())).questions
            }
            if (questions.length === 0) return fail("No questions found. Check the sheet matches the template.")

            // 2. Check everything before uploading any image.
            problems.push(...checkQuestions(questions, images.map(f => f.name)))
            const refs = [...new Set(questions.flatMap(q => [q.image, ...q.optionImages]).filter(r => r && !isWebLink(r)))]
            const byName = new Map(images.map(f => [fileKey(f.name), f]))
            for (const ref of refs) {
                const pic = pictures[pictureIndex(ref)]
                const size = pic ? pic.data.byteLength : byName.get(fileKey(ref))?.size ?? 0
                const label = pic ? "A picture in the sheet" : `Image "${ref}"`
                if (pic && !PICTURE_TYPES[pic.extension.toLowerCase()]) problems.push(`${label} is a .${pic.extension} file; use PNG, JPEG, GIF or WebP`)
                if (size > MAX_IMAGE_BYTES) problems.push(`${label} is larger than 5 MB`)
            }
            if (problems.length) return fail(problems)

            // 3. Upload each image once (a file used by several questions is stored once).
            const urls = new Map<string, string>()
            let done = 0
            setBusy(refs.length ? `Uploading images 0/${refs.length}…` : "Saving…")
            await pool(refs, 3, async ref => {
                const pic = pictures[pictureIndex(ref)]
                const blob = pic
                    ? new Blob([pic.data as BlobPart], { type: PICTURE_TYPES[pic.extension.toLowerCase()] })
                    : byName.get(fileKey(ref))!
                urls.set(ref, await uploadImage(blob, pic ? `picture.${pic.extension}` : fileKey(ref)))
                setBusy(`Uploading images ${++done}/${refs.length}…`)
            })

            // 4. Save all questions (all-or-nothing on the server).
            setBusy("Saving…")
            const rows = questions.map(q => toBulkRow(q, ref => (isWebLink(ref) ? ref.trim() : urls.get(ref) ?? null)))
            const res = await fetch("/api/admin/questions/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: rows, context }),
            })
            if (!res.ok) return setMessage({ ok: false, text: await res.text() })
            const { count } = await res.json()
            const imageNote = refs.length ? ` with ${refs.length} image${refs.length === 1 ? "" : "s"}` : ""
            setMessage({ ok: true, text: `Uploaded ${count} questions${imageNote} to ${contextLabel}.` })
            setFile(null)
            setImages([])
            if (sheetInput.current) sheetInput.current.value = ""
            if (imageInput.current) imageInput.current.value = ""
            onSaved()
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : "Upload failed. Please try again." })
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="font-medium">Upload questions from CSV or Excel</h3>
                    <p className="text-sm text-slate-600">
                        Single-correct, multiple-correct and integer questions, with answers and images.
                        Download a template to see the columns.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadExcel}><Download className="mr-2 h-4 w-4" />Excel template</Button>
                    <Button variant="outline" size="sm" onClick={downloadCsv}><Download className="mr-2 h-4 w-4" />CSV template</Button>
                </div>
            </div>

            <input ref={sheetInput} type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(null) }} />
            <input ref={imageInput} type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
                onChange={e => {
                    // Copy the files first: resetting the input empties its live FileList.
                    const picked = Array.from(e.target.files ?? [])
                    e.target.value = "" // lets the same file be picked again after removing it
                    setImages(prev => [...prev, ...picked])
                    setMessage(null)
                }} />

            <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => sheetInput.current?.click()} className="justify-start">
                    <span className="truncate">{file ? file.name : "Choose CSV or Excel…"}</span>
                </Button>
                <Button variant="outline" onClick={() => imageInput.current?.click()} className="justify-start">
                    <ImagePlus className="mr-2 h-4 w-4" />{images.length ? `${images.length} image${images.length === 1 ? "" : "s"} selected` : "Add image files (optional)"}
                </Button>
                <Button onClick={upload} disabled={!file || !!busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload
                </Button>
            </div>

            {images.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 text-xs">
                    {images.map((img, i) => (
                        <li key={`${img.name}-${i}`} className="flex items-center gap-1 rounded bg-white px-2 py-1 ring-1 ring-slate-200">
                            {img.name}
                            <button type="button" aria-label={`Remove ${img.name}`} onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}>
                                <X className="h-3 w-3" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="space-y-1 text-xs text-slate-500">
                <p><b>Type:</b> SINGLE, MULTIPLE or INTEGER (or leave blank: no options means integer, &quot;A,C&quot; means multiple).</p>
                <p><b>Answer:</b> a letter or the option text; &quot;A,C&quot; for multiple; the number for integer.</p>
                <p><b>Images:</b> put a file name (q1.png) in an image column and add that file above, paste a picture over the cell in Excel, or use a web link to the image.</p>
            </div>

            {busy && <p className="text-sm text-slate-600" role="status">{busy}</p>}
            {message && (
                <p className={`whitespace-pre-line rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
                    {message.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}{message.text}
                </p>
            )}
        </div>
    )
}
