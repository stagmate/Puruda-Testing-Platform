// Random question picking for the test auto-generator.

function shuffle<T>(items: T[], random = Math.random): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

/**
 * Pick `count` questions at random. With `even`, the count is split as evenly as
 * possible across `subjectIds` (in that order); a subject without enough
 * questions leaves its share to the others. Returns null if there aren't enough.
 */
export function pickQuestions<Q extends { id: string; subjectId: string | null }>(
    pool: Q[],
    count: number,
    subjectIds: string[],
    even: boolean,
    random = Math.random,
): Q[] | null {
    if (pool.length < count) return null
    if (!even || subjectIds.length < 2) return shuffle(pool, random).slice(0, count)

    const bySubject = new Map(subjectIds.map(id => [id, shuffle(pool.filter(q => q.subjectId === id), random)]))
    const base = Math.floor(count / subjectIds.length)
    let extra = count % subjectIds.length
    const picked: Q[] = []
    for (const id of subjectIds) {
        const want = base + (extra > 0 ? 1 : 0)
        if (extra > 0) extra--
        picked.push(...(bySubject.get(id) ?? []).splice(0, want))
    }
    // Fill any shortfall from what's left, at random.
    if (picked.length < count) {
        const rest = shuffle(Array.from(bySubject.values()).flat(), random)
        picked.push(...rest.slice(0, count - picked.length))
    }
    // Keep subjects grouped, in the order they were chosen.
    const rank = new Map(subjectIds.map((id, i) => [id, i]))
    return picked.sort((a, b) => (rank.get(a.subjectId ?? "") ?? 0) - (rank.get(b.subjectId ?? "") ?? 0))
}
