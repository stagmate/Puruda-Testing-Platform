import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Leaderboard } from '@/components/leaderboard'

// Mock Fetch
global.fetch = vi.fn()

describe('<Leaderboard />', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it('renders loading state initially', () => {
        // Mock a pending promise
        vi.mocked(fetch).mockImplementation(() => new Promise(() => { }))
        render(<Leaderboard testId="123" />)
        expect(screen.getByText('Loading Leaderboard...')).toBeDefined()
    })

    it('renders list of students after fetch', async () => {
        const mockData = [
            { id: '1', rank: 1, score: 20, total: 20, completedAt: '2023-01-01T10:00:00Z', user: { name: 'Alice', email: 'a@a.com' } },
            { id: '2', rank: 2, score: 10, total: 20, completedAt: '2023-01-01T11:00:00Z', user: { name: 'Bob', email: 'b@b.com' } }
        ]

        vi.mocked(fetch).mockResolvedValue({
            json: async () => mockData
        } as Response)

        render(<Leaderboard testId="123" />)

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Loading Leaderboard...')).toBeNull()
        })

        // Check for Names
        expect(screen.getByText('Alice')).toBeDefined()
        expect(screen.getByText('Bob')).toBeDefined()

        // Check for Ranks
        expect(screen.getByText('#1')).toBeDefined()
        expect(screen.getByText('#2')).toBeDefined()

        // Check for Scores
        expect(screen.getByText('20 / 20')).toBeDefined()
    })
})
