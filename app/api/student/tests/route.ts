import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

// Tests the logged-in student can see: published, and either assigned to one of
// their batches or not assigned to any batch.
export async function GET() {
    const auth = await requireRole(["STUDENT", "ADMIN"])
    if (auth.response) return auth.response
    const userId = auth.user.id

    const tests = await db.test.findMany({
        where: auth.user.role === "ADMIN" ? { isPublished: true } : {
            isPublished: true,
            OR: [
                { batches: { none: {} } },
                { batches: { some: { students: { some: { id: userId } } } } }
            ]
        },
        select: {
            id: true,
            title: true,
            type: true,
            duration: true,
            startTime: true,
            endTime: true,
            _count: { select: { questions: true } },
            attempts: { where: { userId }, select: { submittedAt: true } }
        },
        orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(tests.map(({ attempts, ...t }) => ({
        ...t,
        submitted: attempts.some(a => a.submittedAt !== null)
    })))
}
