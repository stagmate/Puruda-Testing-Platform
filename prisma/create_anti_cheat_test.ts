import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Creating Anti-Cheat Verification Test...")

    // 1. Create Questions
    const questionsData = [
        {
            text: "What indicates that the anti-cheat system is active?",
            options: JSON.stringify(["Red Eye Icon", "Green Checkmark", "Blue Banner", "Nothing"]),
            correct: "0",
            answers: "Red Eye Icon"
        },
        {
            text: "What happens if you switch tabs during the test?",
            options: JSON.stringify(["Nothing", "Warning is recorded", "Immediate Fail", "Computer restarts"]),
            correct: "1",
            answers: "Warning is recorded"
        },
        {
            text: "Is fullscreen mode required for this test?",
            options: JSON.stringify(["Yes", "No", "Optional", "Only on Tuesday"]),
            correct: "0",
            answers: "Yes"
        },
        {
            text: "How many warnings result in auto-submission?",
            options: JSON.stringify(["1", "3", "5", "10"]),
            correct: "1",
            answers: "3"
        },
        {
            text: "What is the primary goal of this test platform?",
            options: JSON.stringify(["Gaming", "Fair Testing", "Social Media", "Shopping"]),
            correct: "1",
            answers: "Fair Testing"
        }
    ]

    const createdQuestions = []

    for (const q of questionsData) {
        const question = await prisma.question.create({
            data: {
                text: q.text,
                options: q.options,
                correct: q.correct
            }
        })
        createdQuestions.push(question)
    }

    console.log(`Created ${createdQuestions.length} questions.`)

    // 2. Create Test
    const test = await prisma.test.create({
        data: {
            title: "Security & Anti-Cheat Validation Protocol",
            type: "MOCK",
            duration: 15, // 15 minutes
            resultMode: "INSTANT",
            showRank: true,
            isPublished: true,
            questions: {
                connect: createdQuestions.map(q => ({ id: q.id }))
            }
        }
    })

    console.log(`Test created successfully: ${test.title} (ID: ${test.id})`)
    console.log("You can now verify the anti-cheat features by taking this test in the Student Dashboard.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
