import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Starting Seed...")

    // 1. Clean up existing data (optional, be careful in prod)
    // await prisma.question.deleteMany()
    // await prisma.test.deleteMany()
    // await prisma.batch.deleteMany()
    // await prisma.course.deleteMany()
    // await prisma.subject.deleteMany()
    // await prisma.user.deleteMany()

    // 2. Users
    const password = await hash("password123", 12)

    const admin = await prisma.user.upsert({
        where: { email: "admin@puruda.com" },
        update: { password },
        create: { email: "admin@puruda.com", name: "Admin User", role: "ADMIN", password },
    })

    const teacher = await prisma.user.upsert({
        where: { email: "teacher@puruda.com" },
        update: { password },
        create: { email: "teacher@puruda.com", name: "Teacher User", role: "TEACHER", password },
    })

    const student = await prisma.user.upsert({
        where: { email: "student@puruda.com" },
        update: { password },
        create: { email: "student@puruda.com", name: "Student User", role: "STUDENT", password },
    })

    console.log("✅ Users Seeded")

    // 3. Metadata
    const subjectsData = ["Physics", "Chemistry", "Mathematics", "Biology"]
    const subjects: any[] = []
    for (const name of subjectsData) {
        const s = await prisma.subject.upsert({
            where: { name },
            update: {},
            create: { name }
        })
        subjects.push(s)
    }

    const course = await prisma.course.upsert({
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

    console.log("✅ Metadata Seeded")

    // 4. Questions
    // 4. Questions Hierarchy & Content
    const difficultyLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"]

    // Helper to create hierarchy and questions
    const seedSubjectContent = async (subjectName: string) => {
        const subject = subjects.find(s => s.name === subjectName)
        if (!subject) return

        // Create Chapters
        const chapters = []
        for (let c = 1; c <= 3; c++) {
            const chapter = await prisma.chapter.create({
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
                const subtopic = await prisma.subtopic.create({
                    data: {
                        name: `${chapter.name} - Topic ${s}`,
                        chapterId: chapter.id
                    }
                })

                for (let q = 1; q <= 5; q++) {
                    const diff = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)]
                    const question = await prisma.question.create({
                        data: {
                            text: `Sample question ${q} for ${subtopic.name} (${diff})`,
                            options: JSON.stringify(["Option A", "Option B", "Option C", "Option D"]),
                            correct: "Option A",
                            difficulty: diff as any, // Cast due to enum import issues in seed
                            type: "SINGLE" as any, // Default to SINGLE
                            subjectId: subject.id,
                            courseId: course.id, // Assuming 'course' is the single course object defined earlier
                            chapterId: chapter.id,
                            subtopicId: subtopic.id
                        }
                    })
                }
            }
            console.log(`   - Seeded content for ${subjectName}`)
        }

        await seedSubjectContent("Physics")
        await seedSubjectContent("Chemistry")
        await seedSubjectContent("Mathematics")

        console.log("✅ Questions & Hierarchy Seeded")

        // 5. Ranking Demo Data
        console.log("📊 Seeding Ranking Demo Data...")

        // Create 5 Demo Students
        const demoStudents = []
        for (let i = 1; i <= 5; i++) {
            const s = await prisma.user.upsert({
                where: { email: `student${i}@puruda.com` },
                update: { password },
                create: { email: `student${i}@puruda.com`, name: `Demo Student ${i}`, role: "STUDENT", password }
            })
            demoStudents.push(s)
        }

        // Create a Demo Test
        // Fetch some physics questions to link
        const physicsQs = await prisma.question.findMany({ where: { subject: { name: "Physics" } }, take: 5 })

        // Need a batch
        const batch = course.batches[0]

        const demoTest = await prisma.test.create({
            data: {
                title: "Physics Weekly Ranking Test",
                duration: 60,
                type: "SUBJECT",
                courseId: course.id,
                startTime: new Date(Date.now() - 86400000), // Started yesterday
                endTime: new Date(Date.now() + 86400000), // Ends tomorrow
                isPublished: true,
                showRank: true, // Enable ranking visibility
                batches: { connect: { id: batch.id } },
                questions: { connect: physicsQs.map(q => ({ id: q.id })) }
            }
        })

        // Create Results (Scenario: Score Tie Broken by Time)
        // Total Marks: 5 Qs * 4 Marks (assumed) = 20? Schema doesn't have marks per Q yet, let's assume 1 per Q = 5 total.
        // Let's assume the UI/Logic treats each Q as 1 mark for now unless updated.

        // Student 3: 5/5, 5 mins -> Rank 1
        await prisma.testResult.create({
            data: {
                testId: demoTest.id,
                userId: demoStudents[2].id, // Student 3
                score: 5,
                total: 5,
                completedAt: new Date(Date.now() - 3600000), // 1 hour ago
            }
        })

        // Student 2: 5/5, 15 mins -> Rank 2
        await prisma.testResult.create({
            data: {
                testId: demoTest.id,
                userId: demoStudents[1].id, // Student 2
                score: 5,
                total: 5,
                completedAt: new Date(Date.now() - 1800000), // 30 mins ago (Finished LATER than Student 3)
            }
        })

        // Student 1: 4/5 -> Rank 3
        await prisma.testResult.create({
            data: {
                testId: demoTest.id,
                userId: demoStudents[0].id, // Student 1
                score: 4,
                total: 5,
                completedAt: new Date(),
            }
        })

        // Student 4: 2/5 -> Rank 4
        await prisma.testResult.create({
            data: {
                testId: demoTest.id,
                userId: demoStudents[3].id, // Student 4
                score: 2,
                total: 5,
                completedAt: new Date(),
            }
        })

        // Student 5: 0/5 -> Rank 5
        await prisma.testResult.create({
            data: {
                testId: demoTest.id,
                userId: demoStudents[4].id, // Student 5
                score: 0,
                total: 5,
                completedAt: new Date(),
            }
        })

        console.log("✅ Ranking Demo Data Seeded!")
    }

    main()
        .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
            process.exit(1)
        })
