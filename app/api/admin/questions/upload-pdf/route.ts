import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAIFileManager } from "@google/generative-ai/server"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "")

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return new NextResponse("No file uploaded", { status: 400 })
        }

        if (!process.env.GEMINI_API_KEY) {
            return new NextResponse("Server configuration error: GEMINI_API_KEY missing", { status: 500 })
        }

        // Save file temporarily
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const tempPath = join(tmpdir(), `upload-${Date.now()}.pdf`)
        await writeFile(tempPath, buffer)

        // Upload to Gemini
        const uploadResponse = await fileManager.uploadFile(tempPath, {
            mimeType: "application/pdf",
            displayName: file.name,
        })

        console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`)

        // Wait for file to be active (usually instant for small PDFs, but good practice)
        // For Flash model, we can often just proceed.

        // Prompt Gemini to parse questions
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
        You are an advanced educational AI parser. Your goal is to extract questions from the uploaded PDF document with high precision, preserving mathematical notation and structure.

        **Task:**
        Extract all questions, including their options, correct answers (if indicated), solution text (if provided), and metadata.

        **Schema (JSON Array):**
        [
          {
            "text": "Full question text. Use LaTeX for math (e.g., $E=mc^2$). Include any passage text if it's a comprehension question.",
            "optionA": "Option A content (LaTeX supported)",
            "optionB": "Option B content",
            "optionC": "Option C content",
            "optionD": "Option D content",
            "correct": "Correct option label (A/B/C/D) or value. If not found, use empty string.",
            "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" (Infer based on context e.g., 'Exercise-01' is Beginner, 'JEE Advanced' is Advanced)",
            "type": "SINGLE" | "MULTIPLE" | "INTEGER" | "SUBJECTIVE",
            "solution": "Step-by-step solution if available in the document. Use LaTeX.",
            "examTag": "Tag like 'JEE Main', 'AIEEE' if explicitly mentioned.",
            "hasDiagram": true/false (Set to true if the question refers to a diagram/graph)
          }
        ]

        **Rules:**
        1. **Math/Chem:** STRICTLY preserve all equations in LaTeX format. Do not simplify or convert to plain text options unless simple.
           - Example: Use $\Delta S^{\circ}$ not "Delta S degree".
        2. **Layout:** Distinctly separation "Solved Examples" from "Exercises". Extract both.
        3. **Answer Keys:** If an answer key table exists at the end of the chapter, use it to populate the 'correct' field for the corresponding questions.
        4. **Images:** If a question has a "Fig." or refers to a diagram, set "hasDiagram": true. (Note: You cannot extract the image file itself yet, just flag it).
        5. **Output:** Return ONLY the raw JSON array. No markdown code blocks.

        Parse the entire document.
        `

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResponse.file.mimeType,
                    fileUri: uploadResponse.file.uri,
                },
            },
            { text: prompt },
        ])

        const responseText = result.response.text()
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()

        // Cleanup: Delete temp file and remove from Gemini Storage to save quota
        await unlink(tempPath).catch(e => console.error("Temp delete failed", e))
        // Note: In production you should delete the file from Gemini too using fileManager.deleteFile(name)
        // fileManager.deleteFile(uploadResponse.file.name).catch(e => console.error("Gemini delete failed", e))

        let parsedQuestions = []
        try {
            parsedQuestions = JSON.parse(cleanedText)
        } catch (error) {
            console.error("JSON Parse Error:", error, "Response:", cleanedText)
            return new NextResponse("Failed to parse AI response. The PDF might be too large or the response format was invalid.", { status: 500 })
        }

        return NextResponse.json(parsedQuestions)

    } catch (error) {
        console.error("Upload Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
