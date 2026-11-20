import { describe, it, expect } from "vitest"
import { expandToInk } from "./crop"

// 40x40 white page: a diagram (box x 10..29, y 12..27 with a cross through it)
// and a separate text line at y 2..3
function page() {
    const w = 40, h = 40, g = new Uint8Array(w * h).fill(255)
    for (let y = 12; y < 28; y++) for (let x = 10; x < 30; x++) if (y === 12 || y === 27 || x === 10 || x === 29) g[y * w + x] = 0
    for (let x = 10; x < 30; x++) g[20 * w + x] = 0
    for (let y = 12; y < 28; y++) g[y * w + 20] = 0
    for (let x = 5; x < 35; x++) { g[2 * w + x] = 0; g[3 * w + x] = 0 }
    return { g, w, h }
}

describe("expandToInk", () => {
    it("grows a box that cuts through the diagram until it is whole", () => {
        const { g, w, h } = page()
        const r = expandToInk(g, w, h, { left: 15, top: 15, right: 25, bottom: 22 }, 20, 20)
        expect(r).toEqual({ left: 9, top: 11, right: 31, bottom: 29 })
    })

    it("leaves a box that already sits in white space alone", () => {
        const { g, w, h } = page()
        const start = { left: 8, top: 8, right: 32, bottom: 32 }
        expect(expandToInk(g, w, h, start, 20, 20)).toEqual(start)
    })

    it("stops at the growth limit and doesn't reach the separate text line", () => {
        const { g, w, h } = page()
        const r = expandToInk(g, w, h, { left: 15, top: 15, right: 25, bottom: 22 }, 2, 2)
        expect(r).toEqual({ left: 13, top: 13, right: 27, bottom: 24 })
        const full = expandToInk(g, w, h, { left: 15, top: 15, right: 25, bottom: 22 }, 20, 20)
        expect(full.top).toBeGreaterThan(4) // blank rows between the box and the text line stop it
    })
})
