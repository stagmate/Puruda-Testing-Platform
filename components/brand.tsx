import { useId } from "react"
import { cn } from "@/lib/utils"

export const APP_NAME = "IT Neet Prep"

/**
 * The IT Neet Prep mark: a heartbeat line (medicine / NEET) that rises into an
 * arrow (preparation, progress) on a teal-to-blue tile.
 */
export function BrandIcon({ className, title }: { className?: string; title?: string }) {
    return (
        <svg viewBox="0 0 64 64" className={cn("h-8 w-8 shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
            <BrandIconPaths />
        </svg>
    )
}

/** Full "IT Neet Prep" logo (icon + name), for light backgrounds. Height sets the size. */
export function BrandLogo({ className, tone = "light" }: { className?: string; priority?: boolean; tone?: "light" | "dark" }) {
    return (
        <svg viewBox="0 0 306 64" className={cn("h-8 w-auto", className)} role="img" aria-label={APP_NAME}>
            <svg x="0" y="0" width="64" height="64"><BrandIconPaths /></svg>
            <text x="78" y="44" fontFamily="inherit" fontSize="34" fontWeight="800" letterSpacing="-0.5" fill={tone === "dark" ? "#ffffff" : "#0b1847"}>
                IT Neet <tspan fill="#0d9488">Prep</tspan>
            </text>
        </svg>
    )
}

// The icon's shapes, for nesting inside another SVG.
function BrandIconPaths() {
    const id = useId().replace(/:/g, "")
    return (
        <>
            <defs>
                <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#14b8a6" />
                    <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="15" fill={`url(#l${id})`} />
            <path d="M9 38h9l5-10 6 18 6-24 5 16 14-16" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M45 22h9v9" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
    )
}

/** App icon with the name beside it; `tone="dark"` for dark backgrounds. */
export function BrandMark({ tone = "light", className, iconClassName }: { tone?: "light" | "dark"; className?: string; iconClassName?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-2", className)}>
            <BrandIcon className={iconClassName} />
            <span className={cn("text-xl font-extrabold tracking-tight", tone === "dark" ? "text-white" : "text-[#0b1847]")}>
                IT Neet <span className={tone === "dark" ? "text-teal-300" : "text-teal-600"}>Prep</span>
            </span>
        </span>
    )
}
