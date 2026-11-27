import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, LEARNER_ONLY } from "@/lib/api-auth"
import { ownAttempt } from "@/lib/practice-server"

type Params = { params: Promise<{ id: string }> }

// Start the same paper again, in the same mode, with a fresh timer.
export async function POST(_req: Request, { params }: Params) {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const a = await ownAttempt(id, auth.user.id)
    if (!a) return new NextResponse("Attempt not found", { status: 404 })
    const fresh = await db.practiceAttempt.create({
        data: {
            userId: a.userId, kind: a.kind, mode: a.mode, title: a.title, paperId: a.paperId,
            questionIds: a.questionIds, duration: a.duration, markingScheme: a.markingScheme,
        },
    })
    return NextResponse.json({ id: fresh.id })
}
