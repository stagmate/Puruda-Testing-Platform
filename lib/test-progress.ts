// Status of each question in the student's test palette.

export type QuestionStatus = "answered" | "not-answered" | "not-visited"

/** A response counts as an answer only if it has content (a choice, a non-empty number). */
export function isAnswered(answer: unknown): boolean {
    if (typeof answer === "number") return Number.isInteger(answer) && answer >= 0
    if (Array.isArray(answer)) return answer.length > 0
    if (typeof answer === "string") return answer.trim() !== ""
    return false
}

export function questionStatus(answer: unknown, visited: boolean): QuestionStatus {
    if (isAnswered(answer)) return "answered"
    return visited ? "not-answered" : "not-visited"
}

export type ProgressSummary = { answered: number; notAnswered: number; notVisited: number; total: number; canSubmit: boolean }

/** Counts for the palette legend; submitting unlocks once every question has been opened. */
export function summarize(ids: string[], answers: Record<string, unknown>, visited: Set<number>): ProgressSummary {
    const s = { answered: 0, notAnswered: 0, notVisited: 0 }
    ids.forEach((id, i) => {
        const st = questionStatus(answers[id], visited.has(i))
        if (st === "answered") s.answered++
        else if (st === "not-answered") s.notAnswered++
        else s.notVisited++
    })
    return { ...s, total: ids.length, canSubmit: ids.length > 0 && s.notVisited === 0 }
}
