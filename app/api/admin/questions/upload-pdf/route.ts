import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
const PDFParser = require("pdf2json")

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            console.error("No file uploaded")
            return new NextResponse("No file uploaded", { status: 400 })
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing")
            return new NextResponse("Server configuration error: GEMINI_API_KEY missing", { status: 500 })
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Extract text from PDF using pdf2json
        const pdfParser = new PDFParser(null, 1); // 1 = text only

        const pdfText = await new Promise<string>((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                // pdf2json returns text in a weird format (URI encoded), usually better to use getRawTextContent() which prints to console or file, 
                // but strictly speaking, `getRawTextContent` is a method on the instance.
                // Actually, `pdf2json`'s data structure is complex. 
                // A better approach with pdf2json for raw text is to just use the text content.
                // `pdfParser.getRawTextContent()` returns the text.
                try {
                    const text = pdfParser.getRawTextContent();
                    resolve(text);
                } catch (e) {
                    reject(e);
                }
            });

            // Parse
            pdfParser.parseBuffer(buffer);
        });

        // Prompt Gemini to parse questions
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
        You are an AI assistant that extracts multiple-choice questions from raw text.
        Extract all questions from the following text and return them as a JSON array.
        
        The JSON structure for each question should be:
        {
            "text": "The question stem...",
            "optionA": "Option A content",
            "optionB": "Option B content",
            "optionC": "Option C content",
            "optionD": "Option D content",
            "correct": "The correct answer value (e.g. 'Option A', 'Option B', or the actual text if ambiguous)",
            "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
            "type": "SINGLE" | "MULTIPLE" | "INTEGER"
        }

        Rules:
        1. If options are not explicitly labeled A, B, C, D, infer them from the order.
        2. Infer difficulty based on complexity if not specified.
        3. If no correct answer is marked, leave "correct" as an empty string.
        4. Remove question numbers (e.g., "1.", "Q1") from the "text" field.
        5. Return ONLY the JSON array. Do not include markdown formatting (like \`\`\`json).

        Input Text:
        ${pdfText.substring(0, 30000)} 
        `

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()

        // Clean up markdown code blocks if present
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()

        let parsedQuestions = []
        try {
            parsedQuestions = JSON.parse(cleanedText)
        } catch (error) {
            console.error("JSON Parse Error:", error, "Response:", cleanedText)
            return new NextResponse("Failed to parse AI response", { status: 500 })
        }

        return NextResponse.json(parsedQuestions)

    } catch (error) {
        console.error("Upload Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
