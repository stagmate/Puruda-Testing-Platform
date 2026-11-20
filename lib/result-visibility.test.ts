import { describe, it, expect } from "vitest"
import { resultsVisible } from "./result-visibility"

describe("resultsVisible", () => {
    it("shows instant results and released manual results only", () => {
        expect(resultsVisible({ resultMode: "INSTANT", resultsReleasedAt: null })).toBe(true)
        expect(resultsVisible({ resultMode: "MANUAL", resultsReleasedAt: null })).toBe(false)
        expect(resultsVisible({ resultMode: "MANUAL", resultsReleasedAt: new Date() })).toBe(true)
    })
})
