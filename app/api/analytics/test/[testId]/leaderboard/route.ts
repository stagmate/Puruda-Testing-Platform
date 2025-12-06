import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request, { params }: { params: { testId: string } }) {
    try {
        const { testId } = params

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
