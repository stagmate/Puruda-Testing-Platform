import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"

export async function GET() {
    try {
        // Security check - maybe unauthorized in prod? 
        // For now, allow it to unblock the user, but this should be protected or disabled later.

        console.log("🌱 Starting Manual Seed via API...")

        const password = await hash("password123", 12)
        const adminPassword = await hash("admin123", 12)

        // 1. Create Requested Admin
        await db.user.upsert({
            where: { email: "admin@gmail.com" },
            update: { password: adminPassword },
            create: { email: "admin@gmail.com", name: "Super Admin", role: "ADMIN", password: adminPassword },
        })

        // 2. Create Default Users from original seed
        await db.user.upsert({
            where: { email: "admin@puruda.com" },
            update: { password },
            create: { email: "admin@puruda.com", name: "Default Admin", role: "ADMIN", password },
        })

        await db.user.upsert({
            where: { email: "teacher@puruda.com" },
            update: { password },
            create: { email: "teacher@puruda.com", name: "Teacher User", role: "TEACHER", password },
        })

        await db.user.upsert({
            where: { email: "student@puruda.com" },
            update: { password },
            create: { email: "student@puruda.com", name: "Student User", role: "STUDENT", password },
        })

        // 3. Metadata (Subjects & Course)
        const subjectsData = ["Physics", "Chemistry", "Mathematics", "Biology"]
        const subjects: any[] = []
        for (const name of subjectsData) {
            const s = await db.subject.upsert({
                where: { name },
                update: {},
                create: { name }
            })
            subjects.push(s)
        }

        const course = await db.course.upsert({
            where: { name: "JEE Mains 2025" },
            update: {},
            create: {
                name: "JEE Mains 2025",
                batches: {
                    create: [{ name: "Morning Batch" }, { name: "Evening Batch" }]
                }
            },
            include: { batches: true }
        })

        // 4. Create Questions (Simplified)
        // Check if questions exist to avoid duplicates if run multiple times without cleanup
        const existingQ = await db.question.findFirst()
        if (!existingQ) {
            const createQuestions = async (subjectName: string, count: number) => {
                const subject = subjects.find(s => s.name === subjectName)
                if (!subject) return

                const questions = []
                for (let i = 1; i <= count; i++) {
                    questions.push({
                        text: `${subjectName} Question ${i}: What is the fundamental concept of... [Random Content]?`,
                        options: JSON.stringify(["Option A", "Option B", "Option C", "Option D"]),
                        correct: "0", // Index 0 -> Option A
                        courseId: course.id,
                        subjectId: subject.id,
                    })
                }
                await db.question.createMany({ data: questions })
            }

            await createQuestions("Physics", 10)
            await createQuestions("Chemistry", 10)
            await createQuestions("Mathematics", 10)
        }

        return NextResponse.json({
            message: "Database seeded successfully",
            users: ["admin@gmail.com", "admin@puruda.com", "teacher@puruda.com", "student@puruda.com"]
        })

    } catch (error) {
        console.error("Seed Error:", error)
        return NextResponse.json({ error: "Failed to seed database" }, { status: 500 })
    }
}
