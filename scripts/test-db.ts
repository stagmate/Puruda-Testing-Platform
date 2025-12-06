import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Testing DB connection...")
    try {
        const courses = await prisma.course.findMany()
        console.log("Courses found:", courses)

        const batches = await prisma.batch.findMany()
        console.log("Batches found:", batches)
    } catch (e) {
        console.error("DB Error:", e)
    }
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
