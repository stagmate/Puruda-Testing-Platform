import { NextResponse } from "next/server"
import { requireRole, LEARNER_ONLY } from "@/lib/api-auth"
import { finishAttempt, ownAttempt } from "@/lib/practice-server"

type Params = { params: Promise<{ id: string }> }

// Finish an attempt and score it. Body: { answers, timeSpent }
export async function POST(req: Request, { params }: Params) {
    const auth = await requireRole(LEARNER_ONLY)
    if (auth.response) return auth.response
    const { id } = await params
    const a = await ownAttempt(id, auth.user.id)
    if (!a) return new NextResponse("Attempt not found", { status: 404 })
    const body = await req.json().catch(() => ({}))
    const done = await finishAttempt(a.id, body ?? {})
    return NextResponse.json({ id: done?.id, score: done?.score, total: done?.total })
}
