export type Result = {
    id: string
    score: number
    total: number
    completedAt: Date
}

export function sortLeaderboard(results: Result[]) {
    return results.sort((a, b) => {
        // Primary: Score Descending
        if (b.score !== a.score) {
            return b.score - a.score
        }
        // Secondary: Completion Time Ascending (Earlier is better)
        return a.completedAt.getTime() - b.completedAt.getTime()
    }).map((r, index) => ({
        ...r,
        rank: index + 1
    }))
}
