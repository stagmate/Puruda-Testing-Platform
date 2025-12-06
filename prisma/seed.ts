import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const difficultyLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"]

async function seedSubject(subjectName: string, subjects: any[], courseId: string) {
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
                await prisma.question.create({
                    data: {
                        text: `Sample question ${q} for ${subtopic.name} (${diff})`,
                        options: JSON.stringify(["Option A", "Option B", "Option C", "Option D"]),
                        correct: "Option A",
                        difficulty: diff as any,
                        type: "SINGLE" as any,
                        subjectId: subject.id,
                        courseId: courseId,
                        chapterId: chapter.id,
                        subtopicId: subtopic.id
                    }
                })
            }
        }
        console.log(`   - Seeded content for ${subjectName}`)
    }
}

async function main() {
    console.log("🌱 Starting Seed...")

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

    // 4. Questions Hierarchy
    await seedSubject("Physics", subjects, course.id)
    await seedSubject("Chemistry", subjects, course.id)
    await seedSubject("Mathematics", subjects, course.id)

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
    const physicsQs = await prisma.question.findMany({ where: { subject: { name: "Physics" } }, take: 5 })
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
            showRank: true,
            batches: { connect: { id: batch.id } },
            questions: { connect: physicsQs.map(q => ({ id: q.id })) }
        }
    })

    // Results
    const results = [
        { u: 2, s: 5, t: -3600000 }, // Rank 1
        { u: 1, s: 5, t: -1800000 }, // Rank 2
        { u: 0, s: 4, t: 0 },        // Rank 3
        { u: 3, s: 2, t: 0 },        // Rank 4
        { u: 4, s: 0, t: 0 }         // Rank 5
    ]

    for (const r of results) {
        await prisma.testResult.create({
            data: {
                testId: demoTest.id,
                userId: demoStudents[r.u].id,
                score: r.s,
                total: 5,
                completedAt: new Date(Date.now() + r.t)
            }
        })
    }

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
