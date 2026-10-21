import { describe, it, expect } from "vitest"
import { parseRichText, richTextToPlain } from "./rich-text"

describe("parseRichText", () => {
    it("handles braced sub and superscripts", () => {
        expect(parseRichText("H_{2}O")).toEqual([
            { kind: "text", value: "H" }, { kind: "sub", value: "2" }, { kind: "text", value: "O" },
        ])
        expect(parseRichText("1.93 × 10^{5} C")).toEqual([
            { kind: "text", value: "1.93 × 10" }, { kind: "sup", value: "5" }, { kind: "text", value: " C" },
        ])
    })

    it("handles ions and shorthand powers", () => {
        expect(parseRichText("Cu^{2+}")[1]).toEqual({ kind: "sup", value: "2+" })
        expect(parseRichText("10^-3 A")).toEqual([
            { kind: "text", value: "10" }, { kind: "sup", value: "-3" }, { kind: "text", value: " A" },
        ])
    })

    it("leaves stray characters alone", () => {
        expect(parseRichText("a_b ^ c")).toEqual([{ kind: "text", value: "a_b ^ c" }])
        expect(parseRichText("x^{unclosed")).toEqual([{ kind: "text", value: "x^{unclosed" }])
    })

    it("keeps line breaks and strips markup for plain text", () => {
        expect(parseRichText("a\nb")).toEqual([{ kind: "text", value: "a" }, { kind: "br" }, { kind: "text", value: "b" }])
        expect(richTextToPlain("SO_{4}^{2−}")).toBe("SO42−")
    })
})
