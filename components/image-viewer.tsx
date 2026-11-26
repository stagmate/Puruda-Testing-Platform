"use client"

import { useEffect, useState } from "react"
import { Maximize, Minus, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const STEPS = [1, 1.5, 2, 3, 4]

/**
 * Full-screen image viewer drawn on top of the page. Opens fitted to the
 * screen; zoom in to inspect details (scroll/drag to move around).
 * Render it inside the test container so it also shows in fullscreen mode.
 */
export function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    const [step, setStep] = useState(0)
    const zoom = STEPS[step]

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if (e.key === "+" || e.key === "=") setStep(s => Math.min(STEPS.length - 1, s + 1))
            if (e.key === "-") setStep(s => Math.max(0, s - 1))
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950" role="dialog" aria-modal="true" aria-label={alt}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
                <span className="truncate text-sm font-medium">{alt}</span>
                <div className="flex items-center gap-1.5">
                    <Button variant="secondary" size="icon-lg" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} aria-label="Zoom out"><Minus className="size-5" /></Button>
                    <span className="w-14 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
                    <Button variant="secondary" size="icon-lg" onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1} aria-label="Zoom in"><Plus className="size-5" /></Button>
                    <Button variant="secondary" size="icon-lg" onClick={() => setStep(0)} disabled={step === 0} aria-label="Fit to screen" title="Fit to screen"><Maximize className="size-5" /></Button>
                    <Button variant="secondary" className="h-10 px-4" onClick={onClose}><X className="size-5" />Close</Button>
                </div>
            </div>
            {/* White canvas so diagrams with transparent backgrounds stay readable.
                Fitted: the image is scaled to fill the screen. Zoomed: it grows and the area scrolls. */}
            <div className="relative min-h-0 flex-1 overflow-auto bg-white" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
                <div className="flex min-h-full min-w-full items-center justify-center p-4" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} onDoubleClick={() => setStep(s => (s === 0 ? 2 : 0))}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={alt} className="h-full w-full object-contain" style={{ cursor: step === 0 ? "zoom-in" : "zoom-out" }} draggable={false} />
                </div>
            </div>
        </div>
    )
}
