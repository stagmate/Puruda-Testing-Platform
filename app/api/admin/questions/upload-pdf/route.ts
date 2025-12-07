import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAIFileManager } from "@google/generative-ai/server"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

// List of models to try in order of preference (Efficiency -> Stability -> Experimental)
const MODELS_TO_TRY = ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-2.0-flash"]

export async function POST(req: Request) {
    let tempPath: string | null = null;
    let fileUri: string | null = null;
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return new NextResponse(JSON.stringify({ error: "No file uploaded" }), { status: 400 })
        }

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error("GOOGLE_API_KEY is missing")
            return new NextResponse(JSON.stringify({ error: "Server configuration error: GOOGLE_API_KEY missing" }), { status: 500 })
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey)
        const fileManager = new GoogleAIFileManager(apiKey)

        // Save file temporarily
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        tempPath = join(tmpdir(), `upload-${Date.now()}.pdf`)
        await writeFile(tempPath, buffer)

        // Upload to Gemini
        try {
            const uploadResponse = await fileManager.uploadFile(tempPath, {
                mimeType: "application/pdf",
                displayName: file.name,
            })
            fileUri = uploadResponse.file.uri
            console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${fileUri}`)
        } catch (uploadError: any) {
            console.error("Gemini File Upload Error:", uploadError)
            return new NextResponse(JSON.stringify({ error: `Gemini Upload Failed: ${uploadError.message}` }), { status: 500 })
        }

        // Prompt Gemini to parse questions
        const prompt = `
        Content Parsing Task:
        Extract ALL multiple-choice questions from this PDF into a JSON array.
        
        Strict JSON Schema:
        [{
          "text": "Question text (LaTeX for math)",
          "optionA": "Option A", "optionB": "Option B", "optionC": "Option C", "optionD": "Option D",
          "correct": "A/B/C/D or value",
          "difficulty": "BEGINNER/INTERMEDIATE/ADVANCED",
          "type": "SINGLE/MULTIPLE/INTEGER/SUBJECTIVE",
          "solution": "Brief solution (LaTeX)",
          "examTag": "Exam Name",
          "hasDiagram": boolean
        }]

        Rules:
        - Output JSON ONLY. No markdown formatted text.
        - Infer options/difficulty if missing.
        - Use Latex for Math.
        `

        let parsedQuestions = []
        let lastError = null;
        let success = false;

        for (const modelName of MODELS_TO_TRY) {
            try {
                console.log(`Attempting parse with model: ${modelName}`)
                const model = genAI.getGenerativeModel({ model: modelName })

                const result = await model.generateContent([
                    {
                        fileData: {
                            mimeType: "application/pdf",
                            fileUri: fileUri,
                        },
                    },
                    { text: prompt },
                ])

                const responseText = result.response.text()
                const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
                parsedQuestions = JSON.parse(cleanedText)
                success = true;
                break; // Parsing successful, exit loop

            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message)
                lastError = error;
                // If it's a 429, we might want to try the next model? 
                // Actually, different models often share the same quota bucket (e.g. all Flash), 
                // but sometimes 1.5 Flash 8b has separate throughput. Worth a try.
                // If 404, definitely try next.
            }
        }

        if (!success) {
            let errorMsg = "AI Model failed to process the PDF."
            if (lastError?.message?.includes("429") || lastError?.message?.includes("Quota")) {
                errorMsg = `Daily Quota Exceeded. Please try a smaller PDF or wait. (Error: 429)`
            } else if (lastError?.message?.includes("404")) {
                errorMsg = `AI Model not found or not enabled. Check project settings.`
            } else if (lastError?.message?.includes("JSON")) {
                errorMsg = `Failed to parse AI response (JSON Error). The PDF might be too complex.`
            }

            console.error("All models failed. Last error:", lastError)
            return new NextResponse(JSON.stringify({ error: errorMsg, details: lastError?.message }), { status: 500 })
        }

        return NextResponse.json(parsedQuestions)

    } catch (error: any) {
        console.error("Upload Error:", error)
        return new NextResponse(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 })
    } finally {
        if (tempPath) await unlink(tempPath).catch(e => console.error("Temp delete failed", e))
        // Note: Production cleanup of fileUri would go here
    }
}
