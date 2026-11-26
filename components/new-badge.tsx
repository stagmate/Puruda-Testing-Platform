import { Sparkles } from "lucide-react"

/** "New" pill for announcements published in the last few days. */
export function NewBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="h-3 w-3" />New
        </span>
    )
}
