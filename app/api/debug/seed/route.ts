import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { Difficulty, QuestionType } from "@prisma/client"

export async function GET() {
    try {
        console.log("🌱 STARTING HARD RESET SEED...")

        // Passwords
        const adminPassword = await hash("admin123", 12)
        const userPassword = await hash("password123", 12)

        // 1. Force Reset Admin
        // Delete first to ensure clean state
        try {
            await db.user.delete({ where: { email: "admin@gmail.com" } }).catch(() => { })
        } catch (e) { }

        const admin = await db.user.create({
            data: {
                email: "admin@gmail.com",
                name: "Super Admin",
                role: "ADMIN",
                password: adminPassword
            }
        })
        console.log("Details: Created admin@gmail.com")

        // 2. Default Users
        const usersToSeed = [
            { email: "teacher@puruda.com", role: "TEACHER", name: "Teacher User" },
            { email: "student@puruda.com", role: "STUDENT", name: "Student User" },
            { email: "student2@puruda.com", role: "STUDENT", name: "Test Student 2" }
        ]

        for (const u of usersToSeed) {
            await db.user.upsert({
                where: { email: u.email },
                update: { password: userPassword, role: u.role }, // Ensure password/role is reset
                create: {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    password: userPassword
                }
            })
        }

        // 3. Ensure Metadata Exists
        const subjectsData = ["Physics", "Chemistry", "Mathematics", "Biology"]
        const subjects: any[] = []
        for (const name of subjectsData) {
            const subject = await db.subject.upsert({ where: { name }, update: {}, create: { name } })
            subjects.push(subject)
        }

        const course = await db.course.upsert({
            where: { name: "JEE Mains 2025" },
            update: {},
            create: {
                name: "JEE Mains 2025",
                batches: { create: [{ name: "Morning" }] }
            }
        })

        // ... inside the function ...

        // 4. Questions with Hierarchy
        const existingQ = await db.question.findFirst()
        if (!existingQ) {
            const difficultyLevels = [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.ADVANCED]

            const seedSubjectContent = async (subjectName: string) => {
                const subject = subjects.find(s => s.name === subjectName)
                if (!subject) return

                // Create Chapters
                const chapters = []
                for (let c = 1; c <= 3; c++) {
                    const chapter = await db.chapter.create({
                        data: {
                            name: `${subjectName} Chapter ${c}`,
                            subjectId: subject.id
                        }
                    })
                    chapters.push(chapter)
                }

                // Create Subtopics & Questions
                for (const chapter of chapters) {
                    for (let s = 1; s <= 2; s++) {
                        const subtopic = await db.subtopic.create({
                            data: {
                                name: `${chapter.name} - Topic ${s}`,
                                chapterId: chapter.id
                            }
                        })

                        const questions: any[] = []
                        for (let q = 1; q <= 5; q++) {
                            const diff = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)]
                            questions.push({
                                text: `[${diff}] ${subtopic.name} Q${q}: Content...`,
                                options: JSON.stringify(["Option A", "Option B", "Option C", "Option D"]),
                                correct: "0",
                                courseId: course.id,
                                subjectId: subject.id,
                                chapterId: chapter.id,
                                subtopicId: subtopic.id,
                                difficulty: diff,
                                type: QuestionType.SINGLE
                            })
                        }
                        await db.question.createMany({ data: questions })
                    }
                }
            }

            await seedSubjectContent("Physics")
            await seedSubjectContent("Chemistry")
            await seedSubjectContent("Mathematics")
        }

        return NextResponse.json({
            status: "Success",
            message: "Database seeded. Admin reset complete.",
            credentials: {
                admin: { email: "admin@gmail.com", pass: "admin123" },
                others: { pass: "password123" }
            }
        })

    } catch (error) {
        console.error("Seed Fatal Error:", error)
        return NextResponse.json({ error: "Seed Failed", details: String(error) }, { status: 500 })
    }
}
