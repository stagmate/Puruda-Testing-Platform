import { db } from "@/lib/db"

// Extra time allowed after the deadline for the final submit request to arrive.
export const SUBMIT_GRACE_MS = 60 * 1000

type TestForAccess = {
    isPublished: boolean
    startTime: Date | null
    endTime: Date | null
    batches: { id: string }[]
}

/**
 * Why a student can't take a test, or null if they can.
 * A test with no batches is open to every student.
 */
export async function studentAccessError(
    test: TestForAccess,
    userId: string,
    now = new Date()
): Promise<{ message: string; status: number } | null> {
    if (!test.isPublished) return { message: "Test not found", status: 404 }

    if (test.batches.length > 0) {
        const enrolled = await db.batch.count({
            where: {
                id: { in: test.batches.map(b => b.id) },
                students: { some: { id: userId } }
            }
        })
        if (enrolled === 0) return { message: "This test is not assigned to your batch", status: 403 }
    }

    if (test.startTime && now < test.startTime) return { message: "Test has not started yet", status: 403 }
    if (test.endTime && now > test.endTime) return { message: "Test has ended", status: 403 }
    return null
}

/** The moment an attempt must be submitted by: start + duration, capped by the test's end time. */
export function attemptDeadline(
    startedAt: Date,
    test: { duration: number; endTime: Date | null }
): Date | null {
    const byDuration = test.duration > 0 ? new Date(startedAt.getTime() + test.duration * 60 * 1000) : null
    if (byDuration && test.endTime) return byDuration < test.endTime ? byDuration : test.endTime
    return byDuration ?? test.endTime
}
