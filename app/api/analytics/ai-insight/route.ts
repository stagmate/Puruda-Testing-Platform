import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse("Unauthorized", { status: 401 })

        // Optional: Admin/Teacher can request for a specific student
        const { userId } = await req.json().catch(() => ({}))
        const targetUserId = (session.user.role === "ADMIN" || session.user.role === "TEACHER") && userId ? userId : session.user.id

        // Fetch User Performance Data
        // 1. Last 5 Test Results with Test details
        const results = await db.testResult.findMany({
            where: { userId: targetUserId },
            take: 5,
            orderBy: { completedAt: "desc" },
            include: {
                test: {
                    include: { course: true }
                }
            }
        })

        if (results.length === 0) {
            return NextResponse.json({
                analysis: "No test data available yet. Please complete a test to get an AI analysis."
            })
        }

        // 2. Format Data for AI
        const historyText = results.map((r: any) =>
            `- Test: ${r.test.title} (${r.test.course?.name || 'General'})
             - Subject Context: ${r.test.type === 'SUBJECT' ? 'Specific Subject Test' : 'Mixed Subjects'}
             - Score: ${r.score}/${r.total}
             - Date: ${new Date(r.completedAt).toLocaleDateString()}
             `
        ).join("\n")

        const prompt = `
        You are an expert Academic Tutor and Counselor for Puruda Classes.
        Analyze the following recent test performance for a student (ID: ${targetUserId}):

        ${historyText}

        Provide a concise, motivating, and actionable report (max 200 words) covering:
        1. **Performance Trend**: Are scores improving or declining?
        2. **Subject/topic analysis**: Based on the test titles/types, identify strong/weak areas.
        3. **Specific Action Plan**: 2-3 concrete steps for the student to improve.
        
        Talk directly to the student ("You..."). Use formatting (bolding, lists).
        `

        // 3. Call Gemini
        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ analysis: "System Error: AI Service Unavailable." }, { status: 500 })
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        const result = await model.generateContent(prompt)
        const analysis = result.response.text()

        return NextResponse.json({ analysis })

    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
