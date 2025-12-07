import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAIFileManager } from "@google/generative-ai/server"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

import { getRotatedKey } from "@/lib/gemini-keys"

// @ts-ignore
const PDFParser = require("pdf2json")

// List of models to try in order of preference
const MODELS_TO_TRY = ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-2.0-flash"]

export async function POST(req: Request) {
    let tempPath: string | null = null;
    let fileUri: string | null = null;
    let apiKey = "";

    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return new NextResponse(JSON.stringify({ error: "No file uploaded" }), { status: 400 })
        }

        apiKey = getRotatedKey();
        if (!apiKey) {
            console.error("No Valid API Key found")
            return new NextResponse(JSON.stringify({ error: "Server configuration error: No valid API Key available." }), { status: 500 })
        }

        console.log("Using API Key (last 4 chars):", apiKey.slice(-4))

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey)
        const fileManager = new GoogleAIFileManager(apiKey)

        // Save file temporarily
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        tempPath = join(tmpdir(), `upload-${Date.now()}.pdf`)
        await writeFile(tempPath, buffer)

        // Strategy:
        // 1. Try Native PDF Upload + Parsing (Multimodal)
        // 2. If Upload or Parse fails (Quota/Error), Fallback to Local Text Extraction + Parsing (Text Only)

        let parsedQuestions = []
        let nativePdfSuccess = false;
        let lastError = null;

        // --- ATTEMPT 1: Native PDF (Multimodal) ---
        try {
            console.log("Attempting Native PDF Upload...")
            const uploadResponse = await fileManager.uploadFile(tempPath, {
                mimeType: "application/pdf",
                displayName: file.name,
            })
            fileUri = uploadResponse.file.uri
            console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${fileUri}`)

            const prompt = `
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
            Rules: Output JSON ONLY. Infer options/difficulty if missing. Use Latex for Math.
            `

            for (const modelName of MODELS_TO_TRY) {
                try {
                    console.log(`Attempting Multimodal parse with ${modelName}`)
                    const model = genAI.getGenerativeModel({ model: modelName })

                    const result = await model.generateContent([
                        { fileData: { mimeType: "application/pdf", fileUri: fileUri } },
                        { text: prompt },
                    ])

                    const responseText = result.response.text()
                    parsedQuestions = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, "").trim())
                    nativePdfSuccess = true;
                    break;
                } catch (e: any) {
                    console.warn(`Multimodal ${modelName} failed:`, e.message)
                    lastError = e;
                    if (e.message?.includes("404")) continue; // Try next model if not found
                    if (e.message?.includes("429")) throw e; // Quota hit? Break to fallback immediately
                }
            }
        } catch (e: any) {
            console.error("Native PDF Parsing Failed completely:", e.message)
            lastError = e;
        }

        // --- ATTEMPT 2: Text-Only Fallback ---
        if (!nativePdfSuccess) {
            console.log("Falling back to Text-Only Parsing (Quota/Error Recovery)...")

            try {
                // Extract Text Locally
                const pdfParser = new PDFParser(null, 1);
                const pdfText = await new Promise<string>((resolve, reject) => {
                    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                    pdfParser.on("pdfParser_dataReady", () => {
                        resolve(pdfParser.getRawTextContent());
                    });
                    pdfParser.parseBuffer(buffer);
                });

                if (!pdfText || pdfText.length < 50) {
                    throw new Error("Extracted text is too empty.")
                }

                const prompt = `
                I have extracted text from a PDF. Please parse questions from it.
                Text Content:
                ${pdfText.substring(0, 30000)}

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
                Rules: Output JSON ONLY. Infer options/difficulty if missing. Use Latex for Math.
                `

                // Try Flash first (Fast/Standard)
                try {
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
                    const result = await model.generateContent(prompt)
                    const responseText = result.response.text()
                    parsedQuestions = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, "").trim())
                } catch (flashError: any) {
                    console.warn("Text Fallback (Flash) failed, trying Pro:", flashError.message)
                    // Try Pro as last resort (Separate Quota bucket usually)
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
                    const result = await model.generateContent(prompt)
                    const responseText = result.response.text()
                    parsedQuestions = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, "").trim())
                }

                // Add a flag to indicate this was a text fallback
                parsedQuestions = parsedQuestions.map((q: any) => ({ ...q, examTag: (q.examTag ? q.examTag + " (Text Fallback)" : "Text Fallback") }))

            } catch (fallbackError: any) {
                console.error("Text Fallback Failed:", fallbackError)
                return new NextResponse(JSON.stringify({
                    error: "All parsing methods failed. Quota limits may be reached.",
                    details: `FALLBACK ERROR (Text Mode): ${fallbackError.message} \n\n PRIMARY ERROR (Native PDF): ${lastError?.message}`
                }), { status: 500 })
            }
        }

        return NextResponse.json(parsedQuestions)

    } catch (error: any) {
        console.error("Upload Error:", error)
        return new NextResponse(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 })
    } finally {
        if (tempPath) await unlink(tempPath).catch(e => console.error("Temp delete failed", e))
    }
}
