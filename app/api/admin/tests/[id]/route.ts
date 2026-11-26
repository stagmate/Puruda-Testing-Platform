import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF, ADMIN_ONLY } from "@/lib/api-auth"
import { gradeWithScheme, normalizeScheme } from "@/lib/marking"
import { orderTestQuestions } from "@/lib/test-order"

type Params = { params: Promise<{ id: string }> }

// One test with its questions in order (for previewing it)
export async function GET(_req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response
    const { id } = await params
    const test = await db.test.findUnique({
        where: { id },
        include: {
            batches: { select: { id: true, name: true } },
            course: { select: { name: true } },
            questions: {
                include: {
                    subject: { select: { name: true } },
                    chapter: { select: { name: true } },
                    subtopic: { select: { name: true } },
                    course: { select: { name: true } },
                    batch: { select: { name: true } },
                },
            },
        },
    })
    if (!test) return new NextResponse("Test not found", { status: 404 })
    return NextResponse.json({ ...test, questions: orderTestQuestions(test.questions, test.questionOrder) })
}

const parseTime = (v: unknown): Date | null | undefined => {
    if (v === undefined) return undefined
    if (v === null || v === "") return null
    const d = new Date(String(v))
    return isNaN(d.getTime()) ? undefined : d
}

// Publish/unpublish, reschedule, change the marking or release the results of a
// test (manual-release mode). A new marking
// scheme re-scores every result already submitted, from the saved answers.
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response
    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return new NextResponse("Invalid request", { status: 400 })

    const test = await db.test.findUnique({ where: { id }, select: { id: true, startTime: true, endTime: true } })
    if (!test) return new NextResponse("Test not found", { status: 404 })

    const data: {
        isPublished?: boolean; startTime?: Date | null; endTime?: Date | null; markingScheme?: string
        resultMode?: string; resultsReleasedAt?: Date | null
        batches?: { set: { id: string }[] }
    } = {}
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished

    // Results: instant, or manual (hidden until released). releaseResults
    // shows or hides a manual test's marks to students.
    if (body.resultMode !== undefined) {
        if (body.resultMode !== "INSTANT" && body.resultMode !== "MANUAL") return new NextResponse("Invalid result mode", { status: 400 })
        data.resultMode = body.resultMode
    }
    if (typeof body.releaseResults === "boolean") data.resultsReleasedAt = body.releaseResults ? new Date() : null

    for (const key of ["startTime", "endTime"] as const) {
        if (key in body) {
            const t = parseTime(body[key])
            if (t === undefined) return new NextResponse(`Invalid ${key === "startTime" ? "start" : "end"} time`, { status: 400 })
            data[key] = t
        }
    }
    const start = data.startTime !== undefined ? data.startTime : test.startTime
    const end = data.endTime !== undefined ? data.endTime : test.endTime
    if (start && end && end <= start) return new NextResponse("End time must be after start time", { status: 400 })

    // Which batches can take the test. An empty list opens it to every student.
    if (body.batchIds !== undefined) {
        if (!Array.isArray(body.batchIds) || body.batchIds.some((b: unknown) => typeof b !== "string")) {
            return new NextResponse("Invalid batches", { status: 400 })
        }
        const ids = Array.from(new Set(body.batchIds as string[]))
        if (ids.length && (await db.batch.count({ where: { id: { in: ids } } })) !== ids.length) {
            return new NextResponse("One of the batches no longer exists", { status: 400 })
        }
        data.batches = { set: ids.map(b => ({ id: b })) }
    }

    if (body.marking !== undefined) data.markingScheme = JSON.stringify(normalizeScheme(body.marking))

    try {
        const rescored = await db.$transaction(async tx => {
            const updated = await tx.test.update({ where: { id }, data, include: { questions: true, results: true } })
            if (data.markingScheme === undefined) return 0
            const scheme = normalizeScheme(JSON.parse(data.markingScheme))
            for (const r of updated.results) {
                let answers: Record<string, unknown> = {}
                try { answers = JSON.parse(r.answers || "{}") } catch { /* keep empty */ }
                const { score, total } = gradeWithScheme(updated.questions, answers, scheme)
                if (score !== r.score || total !== r.total) await tx.testResult.update({ where: { id: r.id }, data: { score, total } })
            }
            return updated.results.length
        }, { timeout: 60_000 })
        return NextResponse.json({ success: true, rescored })
    } catch (error) {
        console.error("[TEST_PATCH]", error)
        return new NextResponse("Couldn't update the test", { status: 500 })
    }
}

// Delete a test with its attempts, results and reviews (admins only).
export async function DELETE(_req: Request, { params }: Params) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    try {
        const deleted = await db.$transaction(async tx => {
            await tx.performanceReview.deleteMany({ where: { testId: id } })
            const results = await tx.testResult.deleteMany({ where: { testId: id } })
            await tx.testAttempt.deleteMany({ where: { testId: id } })
            const test = await tx.test.deleteMany({ where: { id } })
            return { tests: test.count, results: results.count }
        })
        if (deleted.tests === 0) return new NextResponse("Test not found", { status: 404 })
        return NextResponse.json({ success: true, resultsDeleted: deleted.results })
    } catch (error) {
        console.error("[TEST_DELETE]", error)
        return new NextResponse("Couldn't delete the test", { status: 500 })
    }
}
