import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"

const DAY_MS = 24 * 60 * 60 * 1000
const ACTIVITY_DAYS = 14

// Day key ("2026-10-21") in the viewer's timezone. tzOffset is the browser's
// getTimezoneOffset(): minutes to add to local time to get UTC (IST = -330).
function dayKey(date: Date, tzOffset: number) {
    return new Date(date.getTime() - tzOffset * 60 * 1000).toISOString().slice(0, 10)
}

export async function GET(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    try {
        const { searchParams } = new URL(req.url)
        const rawOffset = parseInt(searchParams.get("tzOffset") || "0")
        const tzOffset = Number.isFinite(rawOffset) && Math.abs(rawOffset) <= 14 * 60 ? rawOffset : 0

        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * DAY_MS)
        const activitySince = new Date(now.getTime() - ACTIVITY_DAYS * DAY_MS)

        const [
            usersByRole, newUsersThisWeek,
            courses, batches, subjects, questions,
            tests, draftTests, liveTests, upcomingTestCount,
            submissions, scoreTotals, pendingReviews,
            recentResults, upcomingTests, activity,
        ] = await Promise.all([
            db.user.groupBy({ by: ["role"], _count: { _all: true } }),
            db.user.count({ where: { createdAt: { gte: weekAgo } } }),
            db.course.count(),
            db.batch.count(),
            db.subject.count(),
            db.question.count(),
            db.test.count(),
            db.test.count({ where: { isPublished: false } }),
            db.test.count({
                where: {
                    isPublished: true,
                    startTime: { lte: now },
                    OR: [{ endTime: null }, { endTime: { gte: now } }],
                }
            }),
            db.test.count({ where: { isPublished: true, startTime: { gt: now } } }),
            db.testResult.count(),
            db.testResult.aggregate({ _sum: { score: true, total: true } }),
            db.performanceReview.count({ where: { status: "PENDING" } }),
            db.testResult.findMany({
                take: 6,
                orderBy: { completedAt: "desc" },
                select: {
                    id: true, score: true, total: true, completedAt: true,
                    user: { select: { name: true, email: true } },
                    test: { select: { title: true } },
                }
            }),
            db.test.findMany({
                where: { isPublished: true, OR: [{ startTime: { gt: now } }, { endTime: { gte: now } }] },
                take: 5,
                orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
                select: {
                    id: true, title: true, startTime: true, endTime: true, duration: true,
                    _count: { select: { questions: true, results: true } },
                }
            }),
            db.testResult.findMany({
                where: { completedAt: { gte: activitySince } },
                select: { completedAt: true },
            }),
        ])

        const roleCount = (role: string) => usersByRole.find(r => r.role === role)?._count._all ?? 0
        const totalUsers = usersByRole.reduce((n, r) => n + r._count._all, 0)

        // Submissions per day for the last ACTIVITY_DAYS days, oldest first, zero-filled.
        const perDay = new Map<string, number>()
        for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
            perDay.set(dayKey(new Date(now.getTime() - i * DAY_MS), tzOffset), 0)
        }
        for (const r of activity) {
            const key = dayKey(r.completedAt, tzOffset)
            if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1)
        }

        const scoreSum = scoreTotals._sum.score ?? 0
        const totalSum = scoreTotals._sum.total ?? 0

        return NextResponse.json({
            users: {
                total: totalUsers,
                students: roleCount("STUDENT"),
                teachers: roleCount("TEACHER"),
                admins: roleCount("ADMIN"),
                newThisWeek: newUsersThisWeek,
            },
            catalog: { courses, batches, subjects, questions },
            tests: { total: tests, drafts: draftTests, live: liveTests, upcoming: upcomingTestCount },
            results: {
                submissions,
                averageAccuracy: totalSum > 0 ? Math.round((scoreSum / totalSum) * 100) : null,
            },
            pendingReviews,
            activity: Array.from(perDay, ([date, count]) => ({ date, count })),
            recentResults,
            upcomingTests,
            generatedAt: now,
        })
    } catch (error) {
        console.error("[ADMIN_STATS]", error)
        return NextResponse.json({ error: "Could not load stats" }, { status: 500 })
    }
}
