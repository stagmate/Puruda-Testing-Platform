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
            Extract ALL questions from this PDF into a JSON array, including:
            1. Multiple Choice Questions (MCQs)
            2. Solved Examples (Treat as questions with provided solutions)
            3. Subjective / Numerical Problems (No options)

            Strict JSON Schema:
            [{
              "text": "Question text (LaTeX for math). Include values provided in the question.",
              "optionA": "Option A (or null if subjective)", 
              "optionB": "Option B (or null)", 
              "optionC": "Option C (or null)", 
              "optionD": "Option D (or null)",
              "correct": "Answer option or the calculated value if subjective",
              "difficulty": "BEGINNER/INTERMEDIATE/ADVANCED",
              "type": "SINGLE/MULTIPLE/INTEGER/SUBJECTIVE",
              "solution": "Detailed solution/steps to reach the answer (LaTeX)",
              "examTag": "Exam Name",
              "hasDiagram": boolean
            }]
            Rules: 
            - Output JSON ONLY. 
            - If it's a Solved Example, the "solution" field is CRITICAL. Extract the full solution there.
            - If no options are present, set type to "SUBJECTIVE" and options to null strings.
            - Use Latex for ALL Math.

            **Generative Repair:**
            - If the question text is incomplete or cut off, RECONSTRUCT it based on context.
            - If NO solution is present in the text, YOU MUST GENERATE A DETAILED STEP-BY-STEP SOLUTION.
            - If options are missing but the question is clearly Multiple Choice, generate plausible options or mark as SUBJECTIVE.
            - Ensure all LaTeX is valid and properly escaped.
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
            let pdfText = "";

            try {
                // Extract Text Locally
                const pdfParser = new PDFParser(null, 1);
                pdfText = await new Promise<string>((resolve, reject) => {
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
                I have extracted text from a PDF. Please parse ALL questions from it (MCQs, Examples, Subjective).
                Text Content:
                ${pdfText.substring(0, 30000)}

                Strict JSON Schema:
                [{
                  "text": "Question text (LaTeX for math)",
                  "optionA": "Option A (or null)", "optionB": "Option B (or null)", "optionC": "Option C (or null)", "optionD": "Option D (or null)",
                  "correct": "Answer/Value",
                  "difficulty": "BEGINNER/INTERMEDIATE/ADVANCED",
                  "type": "SINGLE/MULTIPLE/INTEGER/SUBJECTIVE",
                  "solution": "Full Solution (LaTeX)",
                  "examTag": "Exam Name",
                  "hasDiagram": boolean
                }]
                Rules: 
                - Output JSON ONLY. 
                - Capture Solved Examples as questions. 
                - If no options, set type="SUBJECTIVE".
                - Use Latex for Math.

                **Generative Repair:**
                - If text is broken/incomplete, Fix it.
                - GENERATE A SOLUTION if one is missing from the source text.
                - Ensure clear formatting.
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

                // --- ATTEMPT 3: Deterministic Regex/Heuristic Fallback (Non-AI) ---
                console.log("Attempting Regex Parser (Last Resort)...")
                try {
                    const { parseTextWithRegex } = require("@/lib/regex-parser");
                    if (!pdfText) {
                        throw new Error("PDF text was not extracted for regex parsing.");
                    }
                    parsedQuestions = parseTextWithRegex(pdfText);

                    if (parsedQuestions.length === 0) {
                        throw new Error("Regex parser found 0 questions. Format not recognized.");
                    }

                    console.log(`Regex Parser recovered ${parsedQuestions.length} questions.`);

                    // --- ATTEMPT 4: AI Refinement of Regex Output ---
                    if (parsedQuestions.length > 0) {
                        console.log("Attempting AI Refinement of Regex Output...")
                        let refineSuccess = false;
                        let refineErrorMsg = "";

                        // Helper for basic delay
                        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                        // Switch back to 1.5-flash as primary, but add gemini-pro (legacy) as valid backup
                        const REFINE_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

                        for (const modelName of REFINE_MODELS) {
                            try {
                                const currentKey = getRotatedKey();
                                const refineGenAI = new GoogleGenerativeAI(currentKey);
                                const refineModel = refineGenAI.getGenerativeModel({ model: modelName });

                                const fullRefinePrompt = `
                                I have some roughly parsed questions from a PDF. 
                                The options might be merged into the text, or solutions might be missing.
                                Please REFINE and RESTRUCTURE them into clean JSON.

                                Raw Questions:
                                ${JSON.stringify(parsedQuestions.slice(0, 10))} 
                                // Limit to 10 to ensure strict JSON adherence and avoid payload issues.

                                Strict JSON Schema:
                                [{
                                "text": "Clean Question Text (Separate from options). Use LaTeX.",
                                "optionA": "Option A content", 
                                "optionB": "Option B content", 
                                "optionC": "Option C content", 
                                "optionD": "Option D content",
                                "correct": "Correct Answer",
                                "difficulty": "BEGINNER/INTERMEDIATE/ADVANCED",
                                "type": "SINGLE/MULTIPLE/INTEGER/SUBJECTIVE",
                                "solution": "Detailed Solution (Generate if missing)",
                                "examTag": "Exam Name",
                                "hasDiagram": boolean
                                }]
                                
                                Rules:
                                - DETECT options hidden in text (e.g. "(A) 93.4") and move them to option fields.
                                - If a question is a "Solved Example", format it nicely.
                                - GENERATE solutions if missing.
                                `;

                                // Retry Logic: Try up to 2 times per model
                                let attempts = 0;
                                let success = false;
                                let loopError: any = null;

                                while (attempts < 2 && !success) {
                                    try {
                                        attempts++;
                                        const refineResult = await refineModel.generateContent(fullRefinePrompt);
                                        const refineText = refineResult.response.text();
                                        const refinedJson = JSON.parse(refineText.replace(/```json/g, "").replace(/```/g, "").trim());

                                        // Merge/Replace
                                        parsedQuestions = refinedJson.map((q: any) => ({
                                            ...q,
                                            examTag: "Regex + AI Refined"
                                        }));
                                        console.log(`AI Refinement Successful with ${modelName} (Attempt ${attempts})!`);
                                        refineSuccess = true;
                                        success = true;
                                    } catch (e: any) {
                                        loopError = e;
                                        console.warn(`Attempt ${attempts} with ${modelName} failed: ${e.message}`);
                                        if (attempts < 2) await delay(1000); // Wait 1s before retry
                                    }
                                }

                                if (success) break;
                                throw loopError; // Re-throw to catch block below to try next model

                            } catch (refineError: any) {
                                console.warn(`Refinement with ${modelName} failed all attempts:`, refineError.message);
                                refineErrorMsg = refineError.message; // Capture last error
                                // Continue to next model
                            }
                        }

                        if (!refineSuccess) {
                            // Show the ACTUAL error message in the tag so we can debug it
                            // Clean up the error message for display
                            let cleanError = refineErrorMsg.replace(/\[.*?\]/g, "").trim();
                            if (cleanError.startsWith(":")) cleanError = cleanError.substring(1).trim();
                            if (cleanError.length > 30) cleanError = cleanError.substring(0, 30) + "...";

                            parsedQuestions = parsedQuestions.map((q: any) => ({ ...q, examTag: `Regex (Raw) - Err: ${cleanError}` }))
                        }
                    }


                } catch (regexError: any) {
                    console.error("Regex Parser Failed:", regexError);

                    return new NextResponse(JSON.stringify({
                        error: "All parsing methods (AI & Regex) failed.",
                        details: `Native PDF: ${lastError?.message}\nText AI: ${fallbackError.message}\nRegex: ${regexError.message}`
                    }), { status: 500 })
                }
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
