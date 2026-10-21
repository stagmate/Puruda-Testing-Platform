import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/analytics/test/[testId]/leaderboard/route'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

// Mock the session lookup; keep the real role-checking logic.
vi.mock('@/lib/api-auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api-auth')>()
    const getSessionUser = vi.fn()
    return {
        ...actual,
        getSessionUser,
        requireRole: async (roles: readonly string[] = []) => {
            const user = await getSessionUser()
            if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
            if (roles.length && !roles.includes(user.role)) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
            return { user }
        },
    }
})

// Mock the DB
vi.mock('@/lib/db', () => ({
    db: {
        testResult: {
            findMany: vi.fn()
        }
    }
}))

describe('Leaderboard API', () => {
    beforeEach(() => {
        vi.mocked(getSessionUser).mockResolvedValue({ id: 'admin', role: 'ADMIN' })
    })

    it('rejects logged-out callers', async () => {
        vi.mocked(getSessionUser).mockResolvedValue(null)
        const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ testId: '1' }) })
        expect(res.status).toBe(401)
    })

    it('rejects students', async () => {
        vi.mocked(getSessionUser).mockResolvedValue({ id: 's', role: 'STUDENT' })
        const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ testId: '1' }) })
        expect(res.status).toBe(403)
    })

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
        const res = await GET(req, { params: Promise.resolve({ testId: '1' }) })

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
