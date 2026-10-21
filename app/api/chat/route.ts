import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

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

import { getRotatedKey } from "@/lib/gemini-keys"
import { requireRole } from "@/lib/api-auth"

const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY_TURNS = 20

type ChatTurn = { role: "user" | "model"; parts: { text: string }[] }

// Keep only well-formed user/model turns so callers can't inject other roles or huge payloads.
function sanitizeHistory(history: unknown): ChatTurn[] {
    if (!Array.isArray(history)) return []
    return history
        .filter((h): h is ChatTurn =>
            !!h && (h.role === "user" || h.role === "model") && Array.isArray(h.parts))
        .slice(-MAX_HISTORY_TURNS)
        // The widget's greeting is a model turn; drop leading model turns so the
        // conversation after the system prompt starts with the user.
        .filter((h, i, arr) => arr.slice(0, i + 1).some(x => x.role === "user"))
        .map(h => ({
            role: h.role,
            parts: h.parts
                .filter(p => p && typeof p.text === "string")
                .map(p => ({ text: p.text.slice(0, MAX_MESSAGE_CHARS) }))
        }))
}

export async function POST(req: Request) {
    // Logged-in users only, so outsiders can't spend the API quota.
    const auth = await requireRole()
    if (auth.response) return auth.response

    try {
        const apiKey = getRotatedKey();
        if (!apiKey) {
            return NextResponse.json({
                response: "The assistant isn't configured yet. Ask an admin to set GEMINI_API_KEYS."
            }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const body = await req.json().catch(() => ({}))
        const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : ""
        if (!message) return NextResponse.json({ response: "Please type a message." }, { status: 400 })
        const history = sanitizeHistory(body.history)
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
    } catch (error) {
        console.error("Chat Error Details:", error)
        return NextResponse.json({
            response: "I'm having trouble connecting to my brain right now. Please try again later."
        }, { status: 500 })
    }
}
