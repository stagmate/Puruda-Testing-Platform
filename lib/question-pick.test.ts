import { describe, expect, it } from "vitest"
import { pickQuestions } from "./question-pick"

const pool = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, subjectId: "phy" })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, subjectId: "chem" })),
    ...Array.from({ length: 2 }, (_, i) => ({ id: `m${i}`, subjectId: "math" })),
]

describe("pickQuestions", () => {
    it("returns null when the pool is too small", () => {
        expect(pickQuestions(pool, 23, ["phy", "chem", "math"], true)).toBeNull()
    })

    it("picks distinct questions", () => {
        const got = pickQuestions(pool, 15, ["phy", "chem"], false)!
        expect(got).toHaveLength(15)
        expect(new Set(got.map(q => q.id)).size).toBe(15)
    })

    it("splits evenly across subjects and keeps them grouped", () => {
        const got = pickQuestions(pool, 6, ["chem", "phy"], true)!
        expect(got.map(q => q.subjectId)).toEqual(["chem", "chem", "chem", "phy", "phy", "phy"])
    })

    it("fills a short subject's share from the others", () => {
        const got = pickQuestions(pool, 12, ["phy", "chem", "math"], true)!
        expect(got).toHaveLength(12)
        expect(got.filter(q => q.subjectId === "math")).toHaveLength(2)
        expect(new Set(got.map(q => q.id)).size).toBe(12)
    })
})
