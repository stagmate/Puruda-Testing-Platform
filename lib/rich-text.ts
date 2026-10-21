// Lightweight markup for chemistry/maths text:
//   H_{2}O   -> H₂O (subscript)
//   10^{5}   -> 10⁵ (superscript)
//   10^-3    -> shorthand superscript: an optional sign followed by letters/digits
// Everything else is plain text. Line breaks are kept.

export type RichSegment =
    | { kind: "text"; value: string }
    | { kind: "sup"; value: string }
    | { kind: "sub"; value: string }
    | { kind: "br" }

export function parseRichText(input: string): RichSegment[] {
    const out: RichSegment[] = []
    let buf = ""
    const flush = () => { if (buf) { out.push({ kind: "text", value: buf }); buf = "" } }

    for (let i = 0; i < input.length; i++) {
        const ch = input[i]

        if (ch === "\n") { flush(); out.push({ kind: "br" }); continue }

        if ((ch === "^" || ch === "_") && input[i + 1] === "{") {
            const close = input.indexOf("}", i + 2)
            if (close !== -1) {
                flush()
                out.push({ kind: ch === "^" ? "sup" : "sub", value: input.slice(i + 2, close) })
                i = close
                continue
            }
        }

        if (ch === "^") {
            const m = /^[+\-−]?[0-9A-Za-z]+/.exec(input.slice(i + 1))
            if (m) {
                flush()
                out.push({ kind: "sup", value: m[0] })
                i += m[0].length
                continue
            }
        }

        buf += ch
    }
    flush()
    return out
}

/** Plain-text version (markup removed), for search, titles and previews. */
export function richTextToPlain(input: string): string {
    return parseRichText(input).map(s => (s.kind === "br" ? " " : s.value)).join("")
}
