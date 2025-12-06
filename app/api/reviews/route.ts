import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST: Create a review (Teacher only)
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { studentId, testId, subjectId, batchId, feedback, rating } = body

        const review = await db.performanceReview.create({
            data: {
                studentId,
                teacherId: user.id,
                testId,
                subjectId,
                batchId,
                feedback,
                rating: rating ? parseInt(rating) : undefined,
                status: user.role === "ADMIN" ? "APPROVED" : "PENDING" // Auto-approve if admin writes it
            }
        })

        return NextResponse.json(review)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// GET: Fetch reviews
// - Admin -> ALL pending (or filtered status)
// - Teacher -> Their own written reviews
// - Student -> Their own APPROVED reviews
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")

        let whereClause: any = {}

        if (user.role === "STUDENT") {
            // Student sees only approved reviews about themselves
            whereClause = {
                studentId: user.id,
                status: "APPROVED"
            }
        } else if (user.role === "TEACHER") {
            // Teacher sees reviews they WROTE
            whereClause = {
                teacherId: user.id
            }
        } else if (user.role === "ADMIN") {
            // Admin sees all, filterable by status (default PENDING)
            if (status) whereClause.status = status
        }

        const reviews = await db.performanceReview.findMany({
            where: whereClause,
            include: {
                student: { select: { name: true, email: true } },
                teacher: { select: { name: true } },
                test: { select: { title: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(reviews)

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PATCH: Approve/Reject (Admin only)
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { reviewId, status } = await req.json() // status: APPROVED | REJECTED

        const updated = await db.performanceReview.update({
            where: { id: reviewId },
            data: { status }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
