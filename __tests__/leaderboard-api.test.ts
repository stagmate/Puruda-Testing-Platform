import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/analytics/test/[testId]/leaderboard/route'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock the DB
vi.mock('@/lib/db', () => ({
    db: {
        testResult: {
            findMany: vi.fn()
        }
    }
}))

describe('Leaderboard API', () => {
    it('returns ranked results sorted by score and time', async () => {
        // Setup mock data (Unsorted to prove API does sorting)
        // ...actually the DATABASE does the sorting in the real query:
        // orderBy: [{ score: 'desc' }, { completedAt: 'asc' }]
        // So we should mock findMany to return data AS IF the DB sorted it,
        // OR we verify that the API *requests* the correct sorting from the DB.

        // Let's verify the API calls findMany with correct args and then processes the result.

        const mockData = [
            { id: '1', score: 20, total: 20, completedAt: new Date(), user: { name: 'Alice', email: 'alice@b.com' } },
            { id: '2', score: 10, total: 20, completedAt: new Date(), user: { name: 'Bob', email: 'bob@b.com' } }
        ]

        vi.mocked(db.testResult.findMany).mockResolvedValue(mockData as any)

        const req = new Request("http://localhost/api/test/1/leaderboard")
        const res = await GET(req, { params: { testId: '1' } })

        expect(res).toBeInstanceOf(NextResponse)
        const json = await res.json()

        // Verify DB was called correctly with sorting
        expect(db.testResult.findMany).toHaveBeenCalledWith({
            where: { testId: '1' },
            include: { user: { select: { name: true, email: true, id: true } } },
            orderBy: [
                { score: 'desc' },
                { completedAt: 'asc' }
            ]
        })

        // Verify Rank was added
        expect(json).toHaveLength(2)
        expect(json[0].rank).toBe(1)
        expect(json[0].user.name).toBe('Alice')
        expect(json[1].rank).toBe(2)
        expect(json[1].user.name).toBe('Bob')
    })
})
