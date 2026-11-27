// Free PYQ practice: rules shared by the API and the pages.

export const PRACTICE_MODES = ["PRACTICE", "TEST"] as const
export type PracticeMode = (typeof PRACTICE_MODES)[number]
export const isPracticeMode = (v: unknown): v is PracticeMode => v === "PRACTICE" || v === "TEST"

/** JEE Main pace: 180 minutes for 75 questions, i.e. 2.4 minutes a question. */
export function chapterTestMinutes(questionCount: number): number {
    return Math.max(5, Math.ceil(questionCount * 2.4))
}

export const CHAPTER_SET_SIZES = [10, 15, 20, 25, 30] as const

/**
 * Picks questions for a chapter-wise set: ones the learner hasn't seen come
 * first (in random order), then seen ones if there aren't enough new ones.
 */
export function pickChapterSet(poolIds: string[], seen: Set<string>, count: number, random = Math.random): string[] {
    const shuffle = (a: string[]) => {
        const out = [...a]
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1))
            ;[out[i], out[j]] = [out[j], out[i]]
        }
        return out
    }
    const fresh = shuffle(poolIds.filter(id => !seen.has(id)))
    const old = shuffle(poolIds.filter(id => seen.has(id)))
    return [...fresh, ...old].slice(0, Math.max(0, count))
}

/** Deadline of a timed attempt, or null when untimed. */
export function practiceDeadline(a: { mode: string; startedAt: Date | string; duration: number | null }): Date | null {
    if (a.mode !== "TEST" || !a.duration) return null
    return new Date(new Date(a.startedAt).getTime() + a.duration * 60_000)
}

export function parseIds(json: string | null | undefined): string[] {
    try {
        const v = JSON.parse(json || "[]")
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
    } catch {
        return []
    }
}

export function parseSeconds(json: string | null | undefined): Record<string, number> {
    try {
        const v = JSON.parse(json || "{}")
        if (!v || typeof v !== "object" || Array.isArray(v)) return {}
        const out: Record<string, number> = {}
        for (const [k, n] of Object.entries(v)) if (typeof n === "number" && Number.isFinite(n) && n >= 0) out[k] = Math.min(Math.round(n), 6 * 3600)
        return out
    } catch {
        return {}
    }
}

/** "1h 5m", "12m 30s", "45s" */
export function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.round(seconds))
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
    if (h) return `${h}h ${m}m`
    if (m) return r ? `${m}m ${r}s` : `${m}m`
    return `${r}s`
}
