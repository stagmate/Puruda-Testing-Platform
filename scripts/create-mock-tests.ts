// Deploy step: create the JEE mock tests (as drafts) from questions already in
// the bank. Runs only on production builds (or with CREATE_MOCK_TESTS=1), is
// safe to run repeatedly (an existing test with the same title is left alone),
// and never fails the build.
import { PrismaClient } from "@prisma/client"
import { MOCK_TESTS, planMockTest } from "../lib/mock-tests"
import { encodeQuestionOrder } from "../lib/test-order"

async function main() {
    if (process.env.VERCEL_ENV !== "production" && process.env.CREATE_MOCK_TESTS !== "1") {
        console.log("[mock-tests] skipped (not a production build)")
        return
    }
    const db = new PrismaClient()
    try {
        for (const def of MOCK_TESTS) {
            if (await db.test.findFirst({ where: { title: def.title }, select: { id: true } })) {
                console.log(`[mock-tests] "${def.title}" already exists`)
                continue
            }
            const questions = await db.question.findMany({
                where: { examTag: def.examTag },
                select: { id: true, createdAt: true, courseId: true, batchId: true, subject: { select: { name: true } } },
            })
            const plan = planMockTest(def, questions)
            if (!plan.ok) {
                console.log(`[mock-tests] not creating "${def.title}": ${plan.reason}`)
                continue
            }
            await db.test.create({
                data: {
                    title: def.title,
                    type: "MOCK",
                    duration: def.duration,
                    isPublished: false, // a draft: staff publish or schedule it
                    markingScheme: plan.markingScheme,
                    questionOrder: encodeQuestionOrder(plan.questionIds),
                    courseId: plan.courseId,
                    batches: { connect: plan.batchIds.map(id => ({ id })) },
                    questions: { connect: plan.questionIds.map(id => ({ id })) },
                },
            })
            console.log(`[mock-tests] created draft "${def.title}" with ${plan.questionIds.length} questions`)
        }
    } finally {
        await db.$disconnect()
    }
}

main().catch(error => {
    console.error("[mock-tests] failed (build continues):", error)
})
