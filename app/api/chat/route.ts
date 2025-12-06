import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const SYSTEM_PROMPT = `
You are the AI Support Assistant for "Puruda Classes Testing Platform".
Your role is to help Admins, Teachers, and Students use the platform.

Key Features to know:
1. **Roles**: Admin (full access), Teacher (Bank/Tests), Student (Take Tests).
2. **Question Bank**: Supports text, images, and CSV bulk uploads. Tagged by Course/Batch/Subject.
3. **Test Creation**:
   - Auto Generator: AI picks random questions based on filters.
   - Manual Mode: Select specific questions or add new ones on the fly.
4. **Enrolling**: Admins enroll students into Batches.
5. **Security**: Secure Logout ensures no back-button access.

If asked about unrelated topics, politely steer back to the platform.
Keep answers concise and helpful.
`

export async function POST(req: Request) {
    try {
        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ response: "Config Error: GOOGLE_API_KEY is missing in server environment." }, { status: 500 })
        }

        const { message, history = [] } = await req.json()
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
                { role: "model", parts: [{ text: "Understood. I am ready to help with Puruda Platform." }] },
                ...history
            ]
        })

        const result = await chat.sendMessage(message)
        const response = result.response.text()

        return NextResponse.json({ response })
    } catch (error: any) {
        console.error("Chat Error Details:", error)
        console.error("API Key Status:", process.env.GOOGLE_API_KEY ? "Present" : "Missing")
        return NextResponse.json({
            response: `I'm having trouble connecting to my brain right now. Error: ${error.message || "Unknown"}. Please check API Key.`
        }, { status: 500 })
    }
}
