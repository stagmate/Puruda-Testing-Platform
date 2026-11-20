import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { finalizeExpiredAttempts } from "@/lib/finalize-attempts"

export async function GET(req: Request, { params }: { params: Promise<{ testId: string }> }) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const { testId } = await params
        await finalizeExpiredAttempts({ testId })

        const results = await db.testResult.findMany({
            where: { testId },
            include: {
                user: { select: { name: true, email: true, id: true } }
            },
            orderBy: [
                { score: 'desc' },
                { completedAt: 'asc' } // Earliest completion acts as secondary sort
            ]
        })

        // Add Rank property
        const rankedResults = results.map((r, index) => ({
            rank: index + 1,
            id: r.id,
            score: r.score,
            total: r.total,
            completedAt: r.completedAt,
            user: r.user
        }))

        return NextResponse.json(rankedResults)
    } catch (error) {
        console.error("Leaderboard Error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
