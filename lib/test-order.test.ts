import { describe, it, expect } from "vitest"
import { encodeQuestionOrder, orderTestQuestions } from "./test-order"

const q = (id: string, t: number) => ({ id, createdAt: new Date(t) })

describe("orderTestQuestions", () => {
    it("follows the stored order", () => {
        const qs = [q("a", 1), q("b", 2), q("c", 3)]
        expect(orderTestQuestions(qs, encodeQuestionOrder(["c", "a", "b"])).map(x => x.id)).toEqual(["c", "a", "b"])
    })
    it("puts unlisted questions last, oldest first, and survives bad data", () => {
        const qs = [q("x", 5), q("a", 9), q("y", 1)]
        expect(orderTestQuestions(qs, encodeQuestionOrder(["a"])).map(x => x.id)).toEqual(["a", "y", "x"])
        expect(orderTestQuestions(qs, "not json").map(x => x.id)).toEqual(["y", "x", "a"])
        expect(orderTestQuestions(qs, null).map(x => x.id)).toEqual(["y", "x", "a"])
    })
    it("drops duplicate ids", () => {
        expect(encodeQuestionOrder(["a", "b", "a"])).toBe(JSON.stringify(["a", "b"]))
    })
})
