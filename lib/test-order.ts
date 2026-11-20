// Tests keep their questions in a fixed order (e.g. the order of the printed
// paper). The test-question relation itself is unordered, so the order is
// stored on the test as a JSON array of question ids.

export function encodeQuestionOrder(ids: string[]): string {
    return JSON.stringify(Array.from(new Set(ids)))
}

/** Sort a test's questions by its stored order; anything not listed goes last, oldest first. */
export function orderTestQuestions<Q extends { id: string; createdAt?: Date | string | null }>(
    questions: Q[],
    questionOrder: string | null | undefined
): Q[] {
    let order: string[] = []
    try {
        const parsed = questionOrder ? JSON.parse(questionOrder) : []
        if (Array.isArray(parsed)) order = parsed.map(String)
    } catch { /* ignore a malformed value */ }
    const rank = new Map(order.map((id, i) => [id, i]))
    const time = (q: Q) => (q.createdAt ? new Date(q.createdAt).getTime() : 0)
    return [...questions].sort((a, b) => {
        const ra = rank.get(a.id) ?? Infinity, rb = rank.get(b.id) ?? Infinity
        if (ra !== rb) return ra - rb
        return time(a) - time(b) || a.id.localeCompare(b.id)
    })
}
