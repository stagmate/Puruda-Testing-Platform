import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth"

// Empty the question bank (admin only).
//
// Questions that appear in a test can't simply disappear: the test and its
// students' results refer to them. So by default those questions are kept, and
// only when `deleteTests` is set are the tests that use them deleted too (with
// their results, attempts and reviews).

const ASSET_URL = /^\/api\/assets\/([A-Za-z0-9_-]+)$/

async function summary() {
    const [questions, inTests, tests] = await Promise.all([
        db.question.count(),
        db.question.count({ where: { tests: { some: {} } } }),
        db.test.findMany({
            where: { questions: { some: {} } },
            select: { id: true, title: true, _count: { select: { results: true } } },
            orderBy: { createdAt: "desc" },
        }),
    ])
    return {
        questions,
        questionsInTests: inTests,
        tests: tests.map(t => ({ id: t.id, title: t.title, results: t._count.results })),
    }
}

// What would be removed
export async function GET() {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    return NextResponse.json(await summary())
}

export async function POST(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    let body: { confirm?: unknown; deleteTests?: unknown }
    try {
        body = await req.json()
    } catch {
        return new NextResponse("Invalid request", { status: 400 })
    }
    if (body.confirm !== "DELETE") return new NextResponse('Type DELETE to confirm', { status: 400 })
    const deleteTests = body.deleteTests === true

    try {
        const result = await db.$transaction(async tx => {
            let testsDeleted = 0
            let resultsDeleted = 0
            if (deleteTests) {
                const tests = await tx.test.findMany({ where: { questions: { some: {} } }, select: { id: true } })
                const testIds = tests.map(t => t.id)
                if (testIds.length) {
                    await tx.performanceReview.deleteMany({ where: { testId: { in: testIds } } })
                    resultsDeleted = (await tx.testResult.deleteMany({ where: { testId: { in: testIds } } })).count
                    await tx.testAttempt.deleteMany({ where: { testId: { in: testIds } } })
                    testsDeleted = (await tx.test.deleteMany({ where: { id: { in: testIds } } })).count
                }
            }

            const where = deleteTests ? {} : { tests: { none: {} } }
            const doomed = await tx.question.findMany({
                where,
                select: { imageUrl: true, optionAImageUrl: true, optionBImageUrl: true, optionCImageUrl: true, optionDImageUrl: true },
            })
            const questionsDeleted = (await tx.question.deleteMany({ where })).count

            // Remove the uploaded images that only the deleted questions used.
            const urls = (q: (typeof doomed)[number]) => [q.imageUrl, q.optionAImageUrl, q.optionBImageUrl, q.optionCImageUrl, q.optionDImageUrl]
            const assetIds = new Set(doomed.flatMap(urls).map(u => u?.match(ASSET_URL)?.[1]).filter((id): id is string => !!id))
            if (assetIds.size) {
                const remaining = await tx.question.findMany({
                    select: { imageUrl: true, optionAImageUrl: true, optionBImageUrl: true, optionCImageUrl: true, optionDImageUrl: true },
                })
                for (const q of remaining) for (const u of urls(q)) {
                    const id = u?.match(ASSET_URL)?.[1]
                    if (id) assetIds.delete(id)
                }
            }
            const imagesDeleted = assetIds.size
                ? (await tx.asset.deleteMany({ where: { id: { in: Array.from(assetIds) } } })).count
                : 0

            return { questionsDeleted, testsDeleted, resultsDeleted, imagesDeleted }
        }, { timeout: 60_000 })

        return NextResponse.json({ ...result, ...(await summary()) })
    } catch (error) {
        console.error("[QUESTIONS_PURGE]", error)
        return new NextResponse("Couldn't remove the questions", { status: 500 })
    }
}
