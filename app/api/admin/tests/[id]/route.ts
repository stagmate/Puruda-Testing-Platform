import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF, ADMIN_ONLY } from "@/lib/api-auth"
import { gradeWithScheme, normalizeScheme } from "@/lib/marking"

type Params = { params: Promise<{ id: string }> }

const parseTime = (v: unknown): Date | null | undefined => {
    if (v === undefined) return undefined
    if (v === null || v === "") return null
    const d = new Date(String(v))
    return isNaN(d.getTime()) ? undefined : d
}

// Publish/unpublish, reschedule or change the marking of a test. A new marking
// scheme re-scores every result already submitted, from the saved answers.
export async function PATCH(req: Request, { params }: Params) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response
    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return new NextResponse("Invalid request", { status: 400 })

    const test = await db.test.findUnique({ where: { id }, select: { id: true, startTime: true, endTime: true } })
    if (!test) return new NextResponse("Test not found", { status: 404 })

    const data: { isPublished?: boolean; startTime?: Date | null; endTime?: Date | null; markingScheme?: string } = {}
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished

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
