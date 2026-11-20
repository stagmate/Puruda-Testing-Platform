import Image from "next/image"
import { cn } from "@/lib/utils"

export const APP_NAME = "Rankify.me"

/** Full "RankifyMe" logo, for light backgrounds. Height sets the size. */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
    return (
        <Image
            src="/brand/rankify-logo-640.png"
            alt={APP_NAME}
            width={640}
            height={161}
            priority={priority}
            className={cn("h-8 w-auto", className)}
        />
    )
}

/** App icon with the name beside it; `tone="dark"` for dark backgrounds. */
export function BrandMark({ tone = "light", className, iconClassName }: { tone?: "light" | "dark"; className?: string; iconClassName?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-2", className)}>
            <Image src="/brand/rankify-icon-128.png" alt="" width={128} height={128} className={cn("h-8 w-8", iconClassName)} />
            <span className={cn("text-xl font-extrabold tracking-tight", tone === "dark" ? "text-white" : "text-[#0b1847]")}>
                Rankify<span className="text-orange-500">.me</span>
            </span>
        </span>
    )
}
