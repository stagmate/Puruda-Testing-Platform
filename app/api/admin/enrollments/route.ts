import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Get all enrollments as a flat list
export async function GET() {
    const batches = await db.batch.findMany({
        include: {
            students: {
                select: { id: true, name: true, email: true }
            },
            course: {
                select: { name: true }
            }
        }
    })

    // Flatten the data for easier UI consumption: { batchName, courseName, studentName, studentEmail }
    const enrollments = batches.flatMap(batch =>
        batch.students.map(student => ({
            batchId: batch.id,
            batchName: batch.name,
            courseName: batch.course.name,
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email
        }))
    )

    return NextResponse.json(enrollments)
}

// Enroll a student in a batch
export async function POST(req: Request) {
    try {
        const { studentId, batchId } = await req.json()

        // Connect using Prisma's update on Batch (or User)
        const batch = await db.batch.update({
            where: { id: batchId },
            data: {
                students: {
                    connect: { id: studentId }
                }
            }
        })

        return NextResponse.json(batch)
    } catch (error) {
        console.error(error)
        return new NextResponse("Error enrolling student", { status: 500 })
    }
}
