// Allow longer execution time for AI processing (Vercel/Next.js)
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

import { getRotatedKey } from "@/lib/gemini-keys";
// Import regex parser with alias to match existing code usage
import { parseTextWithRegex as extractQuestionsRegex } from "@/lib/regex-parser";

// @ts-ignore
const PDFParser = require("pdf2json");

// Helper: Parse PDF validation locally (since lib might be missing)
async function parsePDFWithPdf2Json(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
            resolve(pdfParser.getRawTextContent());
        });
        pdfParser.loadPDF(filePath);
    });
}

// List of models to try in order of preference
const MODELS_TO_TRY = ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-2.0-flash"];

// Helper to sanitize JSON string
function cleanJsonString(str: string) {
    return str.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    let tempPath: string | null = null;
    let fileUri: string | null = null;
    let apiKey = "";
    let fileManager: GoogleAIFileManager | null = null;

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
        fileManager = new GoogleAIFileManager(apiKey)

        // Save file temporarily
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        tempPath = path.join(tmpdir(), `upload-${Date.now()}.pdf`)
        if (!tempPath) throw new Error("Temp path not initialized");
        await writeFile(tempPath, buffer);

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

                } catch (regexError: any) {
                    console.error("Regex Parser Failed:", regexError);

                    return new NextResponse(JSON.stringify({
                        error: "All parsing methods (AI & Regex) failed.",
                        details: `Native PDF: ${lastError?.message}\nText AI: ${fallbackError.message}\nRegex: ${regexError.message}`
                    }), { status: 500 })
                }
            }
        }
        // --- ATTEMPT 4: AI Refinement of Regex Output ---
        // Only run if we have questions (likely from Regex) and they look raw/incomplete
        const needsRefinement = parsedQuestions.some((q: any) => q.examTag?.includes("Regex"));

        if (parsedQuestions.length > 0 && needsRefinement) {
            console.log("Attempting AI Refinement of Regex Output (Concurrent)...")

            // Helper for basic delay
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            // Models: Try Flash first (fastest), then Pro
            const REFINE_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

            // Chunking Logic
            const CHUNK_SIZE = 4;
            // aggressively use keys (we have ~6 keys now)
            const CONCURRENCY_LIMIT = 6;
            let refinedAllQuestions: any[] = [];

            // Split into chunks
            const chunks: any[][] = [];
            for (let i = 0; i < parsedQuestions.length; i += CHUNK_SIZE) {
                chunks.push(parsedQuestions.slice(i, i + CHUNK_SIZE));
            }

            console.log(`Processing ${chunks.length} chunks (Limit: ${CONCURRENCY_LIMIT} concurrent)...`);

            // PROCESS CHUNKS IN PARALLEL BATCHES
            for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
                // Circuit Breaker: If we are nearing the 60s timeout (e.g. > 45s passed), STOP.
                // Better to return some raw questions than to timeout completely.
                if (Date.now() - startTime > 45000) {
                    console.warn("Time Budget Exceeded! Returning remaining questions as RAW.");
                    // Append remaining raw chunks
                    for (let j = i; j < chunks.length; j++) {
                        const rawChunk = chunks[j].map((q: any) => ({ ...q, examTag: `Regex (Raw) - Timed Out` }));
                        refinedAllQuestions.push(...rawChunk);
                    }
                    break; // Exit loop
                }

                const batchStart = i;
                const batchChunks = chunks.slice(i, i + CONCURRENCY_LIMIT);

                console.log(`Starting batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}...`);

                // Create promises for this batch
                const batchPromises = batchChunks.map(async (chunk, batchIndex) => {
                    const chunkId = batchStart + batchIndex + 1;
                    let chunkSuccess = false;
                    let chunkRefined: any[] = [];
                    let chunkErrorMsg = "";

                    // Try to refine this individual chunk
                    for (const modelName of REFINE_MODELS) {
                        try {
                            const currentKey = getRotatedKey();
                            const refineGenAI = new GoogleGenerativeAI(currentKey);
                            const refineModel = refineGenAI.getGenerativeModel({ model: modelName });

                            const chunkPrompt = `
                            Refine these specific questions.
                            Raw: ${JSON.stringify(chunk)}
                            Strict JSON Schema:
                            [{
                              "text": "Question text (LaTeX)",
                              "optionA": "Opt A", "optionB": "Opt B", "optionC": "Opt C", "optionD": "Opt D",
                              "correct": "Answer",
                              "difficulty": "BEGINNER/INTERMEDIATE/ADVANCED",
                              "type": "SINGLE/MULTIPLE/INTEGER/SUBJECTIVE",
                              "solution": "Solution",
                              "examTag": "Exam Name",
                              "hasDiagram": boolean
                            }]
                            Rules: Output JSON ONLY.
                            `;

                            // Retry per model loop
                            let attempts = 0;
                            while (attempts < 2 && !chunkSuccess) {
                                try {
                                    attempts++;
                                    const result = await refineModel.generateContent(chunkPrompt);
                                    const text = result.response.text();
                                    const json = JSON.parse(cleanJsonString(text));

                                    if (json.length > 0) {
                                        chunkRefined = json.map((q: any) => ({ ...q, examTag: "Regex + AI Refined" }));
                                        chunkSuccess = true;
                                        console.log(`Chunk ${chunkId} success (${modelName})`);
                                    }
                                } catch (e: any) {
                                    console.warn(`Chunk ${chunkId} retry ${attempts} failed: ${e.message}`);
                                    if (attempts < 2) await delay(1000 + Math.random() * 500); // Backoff with jitter
                                    chunkErrorMsg = e.message;
                                }
                            }

                            if (chunkSuccess) break;

                        } catch (e: any) {
                            // Model init failed
                        }
                    }

                    // Return processed chunk or raw fallback
                    if (chunkSuccess) {
                        return chunkRefined;
                    } else {
                        console.log(`Chunk ${chunkId} FAILED. Keeping raw.`);
                        let cleanError = chunkErrorMsg.replace(/\[.*?\]/g, "").trim().substring(0, 30);
                        return chunk.map((q: any) => ({ ...q, examTag: `Regex (Raw) - Err: ${cleanError}` }));
                    }
                });

                // Wait for the entire batch to finish
                const batchResults = await Promise.all(batchPromises);

                // Collect results
                batchResults.forEach(res => refinedAllQuestions.push(...res));
            }

            // Replace the main list
            parsedQuestions = refinedAllQuestions;
        }
        return NextResponse.json(parsedQuestions)

    } catch (error: any) {
        console.error("Upload Error:", error)
        return new NextResponse(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 })
    } finally {
        if (fileUri && fileManager) {
            try {
                await fileManager.deleteFile(fileUri).catch((e: any) => console.warn("Remote delete failed", e.message));
            } catch (e) { /* ignore */ }
        }
        if (tempPath) await unlink(tempPath).catch(e => console.error("Temp delete failed", e))
    }
}
