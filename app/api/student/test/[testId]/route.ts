import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ testId: string }> }
) {
    try {
        const { testId } = await params

        if (!testId) {
            return new NextResponse("Test ID is required", { status: 400 })
        }

        const test = await db.test.findUnique({
            where: {
                id: testId
            },
            include: {
                questions: true
            }
        })

        if (!test) {
            return new NextResponse("Test not found", { status: 404 })
        }

        // Parse options from JSON string to Array
        const formattedTest = {
            ...test,
            questions: test.questions.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }))
        }

        return NextResponse.json(formattedTest)
    } catch (error) {
        console.error("[TEST_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
