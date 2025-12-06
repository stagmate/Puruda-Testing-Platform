import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    const assignments = await db.teacherAssignment.findMany({
        include: {
            teacher: { select: { name: true, email: true } },
            batch: {
                select: {
                    name: true,
                    course: { select: { name: true } }
                }
            },
            subject: { select: { name: true } }
        }
    })
    return NextResponse.json(assignments)
}

export async function POST(req: Request) {
    try {
        const { teacherId, batchId, subjectId } = await req.json()

        // Check if exists
        const existing = await db.teacherAssignment.findFirst({
            where: { teacherId, batchId, subjectId }
        })

        if (existing) {
            return new NextResponse("Assignment already exists", { status: 400 })
        }

        const assignment = await db.teacherAssignment.create({
            data: { teacherId, batchId, subjectId }
        })
        return NextResponse.json(assignment)
    } catch (error) {
        console.error(error)
        return new NextResponse("Error creating assignment", { status: 500 })
    }
}
