"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, X, RefreshCw } from "lucide-react"
import { uploadImage } from "@/lib/pdf-import/browser"
import { cn } from "@/lib/utils"

/** Thumbnail with add / replace / remove for one image (question or option). */
export function ImageSlot({ url, onChange, label, compact = false }: {
    url: string | null
    onChange: (url: string | null) => void
    label: string
    compact?: boolean
}) {
    const input = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    const pick = async (file: File | undefined) => {
        if (!file) return
        setBusy(true)
        setError("")
        try {
            onChange(await uploadImage(file, file.name))
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed")
        } finally {
            setBusy(false)
            if (input.current) input.current.value = ""
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={e => pick(e.target.files?.[0])} />
            {url ? (
                <div className="flex items-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={label} className={cn("rounded border bg-white object-contain", compact ? "max-h-16 max-w-28" : "max-h-40 max-w-full")} />
                    <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600" aria-label={`Replace ${label}`}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{!compact && "Replace"}
                        </button>
                        <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-red-600" aria-label={`Remove ${label}`}>
                            <X className="h-3.5 w-3.5" />{!compact && "Remove"}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                    className={cn("inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600", compact && "px-2")}
                    aria-label={`Add ${label}`}
                >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {compact ? "Image" : `Add ${label}`}
                </button>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    )
}
