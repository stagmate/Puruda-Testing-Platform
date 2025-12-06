import { describe, it, expect } from 'vitest'
import { sortLeaderboard } from '../lib/ranking-utils'

describe('Ranking Logic', () => {
    it('sorts by score descending', () => {
        const data = [
            { id: '1', score: 10, total: 20, completedAt: new Date('2023-01-01') },
            { id: '2', score: 20, total: 20, completedAt: new Date('2023-01-01') },
        ]
        const sorted = sortLeaderboard(data)
        expect(sorted[0].id).toBe('2')
        expect(sorted[0].rank).toBe(1)
        expect(sorted[1].id).toBe('1')
        expect(sorted[1].rank).toBe(2)
    })

    it('breaks ties with completion time (earlier is better)', () => {
        const data = [
            { id: 'late', score: 20, total: 20, completedAt: new Date('2023-01-02') },
            { id: 'early', score: 20, total: 20, completedAt: new Date('2023-01-01') },
        ]
        const sorted = sortLeaderboard(data)
        expect(sorted[0].id).toBe('early') // Early finisher wins
        expect(sorted[1].id).toBe('late')
    })
})
