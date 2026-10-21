import { Fragment } from "react"
import { parseRichText } from "@/lib/rich-text"

/** Renders question text with ^{superscript} and _{subscript} markup. */
export function RichText({ text, className }: { text: string | null | undefined; className?: string }) {
    if (!text) return null
    return (
        <span className={className}>
            {parseRichText(text).map((seg, i) => {
                if (seg.kind === "br") return <br key={i} />
                if (seg.kind === "sup") return <sup key={i}>{seg.value}</sup>
                if (seg.kind === "sub") return <sub key={i}>{seg.value}</sub>
                return <Fragment key={i}>{seg.value}</Fragment>
            })}
        </span>
    )
}
