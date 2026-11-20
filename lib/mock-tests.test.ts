import { describe, it, expect } from "vitest"
import { MOCK_TESTS, planMockTest, type BankQuestion } from "./mock-tests"
import { parseScheme, presetOf } from "./marking"

const main = MOCK_TESTS[0]
const bank = (subjects: string[], course = "c1", batch: string | null = "b1"): BankQuestion[] =>
    subjects.map((s, i) => ({ id: `q${i}`, createdAt: new Date(1_000_000 - i), subject: { name: s }, courseId: course, batchId: batch }))
const paper = () => [...Array(25).fill("Mathematics"), ...Array(25).fill("Physics"), ...Array(25).fill("Chemistry")]

describe("planMockTest", () => {
    it("orders a pack's questions in paper order", () => {
        const qs = bank(paper())
        const plan = planMockTest(main, [...qs].reverse())
        expect(plan.ok).toBe(true)
        if (!plan.ok) return
        expect(plan.questionIds).toEqual(qs.map(q => q.id))
        expect(plan.courseId).toBe("c1")
        expect(plan.batchIds).toEqual(["b1"])
        expect(presetOf(parseScheme(plan.markingScheme))).toBe("JEE_MAIN")
    })

    it("refuses missing questions, duplicates and a different order", () => {
        expect(planMockTest(main, bank(paper().slice(1)))).toMatchObject({ ok: false })
        expect(planMockTest(main, bank([...paper(), ...paper()]))).toMatchObject({ ok: false })
        const swapped = paper(); swapped[0] = "Physics"; swapped[30] = "Mathematics"
        expect(planMockTest(main, bank(swapped))).toMatchObject({ ok: false, reason: expect.stringMatching(/question 1/) })
    })

    it("leaves the course empty when questions span courses", () => {
        const qs = bank(paper()); qs[3].courseId = "c2"; qs[4].batchId = null
        const plan = planMockTest(main, qs)
        expect(plan.ok && plan.courseId).toBe(null)
        expect(plan.ok && plan.batchIds).toEqual(["b1"])
    })
})
