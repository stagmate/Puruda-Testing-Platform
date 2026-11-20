// Grow a crop rectangle until none of its edges cuts through ink, so a
// diagram whose AI-estimated box is slightly too tight still comes out whole.
// Works on a grayscale page (0 = black, 255 = white), one byte per pixel.

export type Rect = { left: number; top: number; right: number; bottom: number } // right/bottom exclusive

const INK = 200 // darker than this counts as ink

function rowHasInk(gray: Uint8Array, width: number, y: number, x0: number, x1: number) {
    const base = y * width
    for (let x = x0; x < x1; x++) if (gray[base + x] < INK) return true
    return false
}

function colHasInk(gray: Uint8Array, width: number, x: number, y0: number, y1: number) {
    for (let y = y0; y < y1; y++) if (gray[y * width + x] < INK) return true
    return false
}

/**
 * Move each edge outward, one line at a time, while the line just inside it
 * contains ink, up to maxGrowX/maxGrowY pixels per side. Repeats until stable
 * because growing one side can extend the span the other sides check.
 */
export function expandToInk(gray: Uint8Array, width: number, height: number, start: Rect, maxGrowX: number, maxGrowY: number): Rect {
    const r = { ...start }
    const limit = {
        left: Math.max(0, start.left - maxGrowX),
        right: Math.min(width, start.right + maxGrowX),
        top: Math.max(0, start.top - maxGrowY),
        bottom: Math.min(height, start.bottom + maxGrowY),
    }
    for (let pass = 0; pass < 4; pass++) {
        const before = JSON.stringify(r)
        while (r.top > limit.top && rowHasInk(gray, width, r.top, r.left, r.right)) r.top--
        while (r.bottom < limit.bottom && rowHasInk(gray, width, r.bottom - 1, r.left, r.right)) r.bottom++
        while (r.left > limit.left && colHasInk(gray, width, r.left, r.top, r.bottom)) r.left--
        while (r.right < limit.right && colHasInk(gray, width, r.right - 1, r.top, r.bottom)) r.right++
        if (JSON.stringify(r) === before) break
    }
    return r
}
