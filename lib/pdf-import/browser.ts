"use client"

// Browser-side PDF import: render pages with pdf.js, send them to the AI in
// small overlapping batches, merge the results, then crop each diagram out of
// its page image and upload it.

import type { Extraction, FigureRef } from "./extraction"
import { mergeExtractions, type ImportedQuestion } from "./merge"

const RENDER_WIDTH = 1400      // px; enough for crisp diagrams, small enough to upload
const FOCUS_PAGES = 2          // pages each AI call is responsible for (keeps each call well under a minute or two)
const CONCURRENCY = 3
const MAX_PAGES = 120

export type PageImage = { page: number; dataUrl: string; width: number; height: number }

export type ImportProgress =
    | { stage: "render"; done: number; total: number }
    | { stage: "read"; done: number; total: number }
    | { stage: "figures"; done: number; total: number }

export class ImportError extends Error {}

// The "legacy" build includes fallbacks for JavaScript features that the
// standard build assumes (it fails on browsers more than a few months old).
async function loadPdfJs() {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString()
    }
    return pdfjs
}

export async function renderPdf(file: File, onProgress?: (p: ImportProgress) => void, signal?: AbortSignal): Promise<PageImage[]> {
    const pdfjs = await loadPdfJs()
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    try {
        if (doc.numPages > MAX_PAGES) throw new ImportError(`This PDF has ${doc.numPages} pages; split it into parts of ${MAX_PAGES} or fewer.`)
        const pages: PageImage[] = []
        for (let n = 1; n <= doc.numPages; n++) {
            if (signal?.aborted) throw new ImportError("Cancelled")
            const page = await doc.getPage(n)
            const base = page.getViewport({ scale: 1 })
            const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width })
            const canvas = document.createElement("canvas")
            canvas.width = Math.round(viewport.width)
            canvas.height = Math.round(viewport.height)
            const ctx = canvas.getContext("2d")!
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            await page.render({ canvas, canvasContext: ctx, viewport }).promise
            pages.push({ page: n, dataUrl: canvas.toDataURL("image/jpeg", 0.82), width: canvas.width, height: canvas.height })
            page.cleanup()
            onProgress?.({ stage: "render", done: n, total: doc.numPages })
        }
        return pages
    } finally {
        await doc.destroy()
    }
}

class FatalImportError extends ImportError {}

async function extractBatch(pages: PageImage[], from: number, to: number, signal?: AbortSignal): Promise<Extraction> {
    const send = pages.filter(p => p.page >= from - 1 && p.page <= to + 1)
    for (let attempt = 0; ; attempt++) {
        const res = await fetch("/api/admin/questions/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from, to, pages: send.map(p => ({ page: p.page, image: p.dataUrl, width: p.width, height: p.height })) }),
            signal,
        })
        if (res.ok) return res.json()
        const msg = await res.json().then(j => j.error).catch(() => res.statusText)
        // Not configured / not allowed: every batch would fail the same way.
        if (res.status === 503 || res.status === 401 || res.status === 403) throw new FatalImportError(msg || `Error ${res.status}`)
        // Busy, overloaded or timed out: wait and retry a couple of times.
        if ([429, 502, 504].includes(res.status) && attempt < 2) {
            await new Promise(r => setTimeout(r, 5000 * (attempt + 1)))
            continue
        }
        throw new ImportError(`Pages ${from}–${to}: ${msg || `error ${res.status}`}`)
    }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length)
    let next = 0
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const i = next++
            out[i] = await fn(items[i], i)
        }
    }))
    return out
}

/**
 * Read every page with the AI. A batch that still fails after retries is skipped
 * and reported in `failed`, so one bad page doesn't lose the rest of the paper.
 */
export async function extractQuestions(pages: PageImage[], onProgress?: (p: ImportProgress) => void, signal?: AbortSignal) {
    const ranges: [number, number][] = []
    for (let s = 1; s <= pages.length; s += FOCUS_PAGES) ranges.push([s, Math.min(pages.length, s + FOCUS_PAGES - 1)])
    let done = 0
    const failed: string[] = []
    onProgress?.({ stage: "read", done, total: ranges.length })
    const results = await pool(ranges, CONCURRENCY, async ([from, to]) => {
        try {
            return await extractBatch(pages, from, to, signal)
        } catch (e) {
            if (e instanceof FatalImportError || signal?.aborted) throw e
            failed.push(e instanceof Error ? e.message : `Pages ${from}–${to} failed`)
            return { questions: [], answers: [] } as Extraction
        } finally {
            onProgress?.({ stage: "read", done: ++done, total: ranges.length })
        }
    })
    if (failed.length === ranges.length) throw new ImportError(failed[0])
    return { questions: mergeExtractions(results), failed: failed.sort() }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error("Could not load page image"))
        img.src = src
    })
}

/** Crop a figure out of its rendered page (with a little padding) as a PNG. */
export async function cropFigure(page: PageImage, fig: FigureRef, pad = 0.012): Promise<Blob> {
    const img = await loadImage(page.dataUrl)
    const [y1, x1, y2, x2] = fig.box.map(v => v / 1000)
    const left = Math.max(0, (x1 - pad) * img.width)
    const top = Math.max(0, (y1 - pad) * img.height)
    const right = Math.min(img.width, (x2 + pad) * img.width)
    const bottom = Math.min(img.height, (y2 + pad) * img.height)
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(right - left))
    canvas.height = Math.max(1, Math.round(bottom - top))
    canvas.getContext("2d")!.drawImage(img, left, top, right - left, bottom - top, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/png"))
}

export async function uploadImage(blob: Blob, name = "image.png"): Promise<string> {
    const form = new FormData()
    form.append("file", blob, name)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) throw new ImportError(await res.text().catch(() => "Upload failed"))
    return (await res.json()).url
}

/** Crop and upload every diagram, filling in the drafts' image URLs. */
export async function attachFigures(questions: ImportedQuestion[], pages: PageImage[], onProgress?: (p: ImportProgress) => void) {
    const jobs: { q: ImportedQuestion; slot: number; fig: FigureRef }[] = []
    for (const q of questions) {
        if (q.questionFigure) jobs.push({ q, slot: -1, fig: q.questionFigure })
        q.optionFigures.forEach((fig, slot) => { if (fig) jobs.push({ q, slot, fig }) })
    }
    let done = 0
    onProgress?.({ stage: "figures", done, total: jobs.length })
    await pool(jobs, 3, async ({ q, slot, fig }) => {
        const page = pages.find(p => p.page === fig.page)
        try {
            if (!page) throw new Error("page missing")
            const url = await uploadImage(await cropFigure(page, fig), `q${q.number}.png`)
            if (slot === -1) q.draft.imageUrl = url
            else q.draft.optionImages[slot] = url
        } catch {
            q.warnings.push(slot === -1 ? "Couldn't save the diagram; add it manually" : `Couldn't save the image for option ${"ABCD"[slot]}`)
        }
        onProgress?.({ stage: "figures", done: ++done, total: jobs.length })
    })
    return questions
}
