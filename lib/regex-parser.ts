export interface ExtractedQuestion {
    text: string;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
    correct: string;
    difficulty: string;
    type: string;
    solution: string;
    examTag: string;
    hasDiagram: boolean;
}

export function parseTextWithRegex(text: string): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];

    // Normalize text: remove weird chars, ensure standardized spacing
    const cleanText = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");

    // Regex to find Question Start
    // Matches: "1.", "1 .", "Q1.", "Ex. 1", "Example 1" at start of line
    // Relaxed to allow space between number and dot: (\d+)\s*[\.:]
    const questionStartRegex = /\n\s*(?:Q\.?|Question|Ex\.?|Example)?\s*(\d+)\s*[\.:]\s+/gi;

    let match;
    let lastIndex = 0;
    let currentQuestion: Partial<ExtractedQuestion> | null = null;
    let currentNumber = "";

    // Helper to process the previous question block before starting a new one
    const processLastQuestion = (endIndex: number) => {
        if (!currentQuestion) return;

        const fullBlock = cleanText.substring(lastIndex, endIndex).trim();

        // Split block into Question Text, Options, Solution
        // 1. Look for Solution
        // We find the SOLUTION first so we can remove it from the block.
        // This prevents "Sol. ..." from being merged into Option D.
        const solMatch = fullBlock.match(/\n\s*(?:Sol\.?|Solution|Ans\.?|Answer)[\.:]\s*([\s\S]*)/i);
        let textAndOptionsBlock = fullBlock;

        if (solMatch) {
            currentQuestion.solution = solMatch[1].trim();
            // CRITICAL: Remove solution from the block we use to find text/options
            // solMatch.index is where "Sol." starts.
            if (solMatch.index !== undefined) {
                textAndOptionsBlock = fullBlock.substring(0, solMatch.index).trim();
            }
        }

        // 2. Look for Options in the truncated block
        // Matches "(A)" or "(a)" or "A." or "A)" preceded by newline OR space
        const optionARegex = /(?:^|\s|\n)(?:\([aA]\)|[aA]\.|[aA]\))(?:\s+|$)/;

        const idxA = textAndOptionsBlock.search(optionARegex);

        if (idxA !== -1) {
            // Options exist
            currentQuestion.text = textAndOptionsBlock.substring(0, idxA).trim();
            const rest = textAndOptionsBlock.substring(idxA);

            // Heuristic splitting of options
            const splitRegex = /(?:^|\s|\n)(?:\([abcdABCD]\)|[abcdABCD]\.|[abcdABCD]\))(?:\s+|$)/;
            const splitOptions = rest.split(splitRegex).filter(s => s.trim().length > 0);

            // splitOptions entries should correspond to A, B, C, D in order
            if (splitOptions.length >= 1) currentQuestion.optionA = splitOptions[0].trim();
            if (splitOptions.length >= 2) currentQuestion.optionB = splitOptions[1].trim();
            if (splitOptions.length >= 3) currentQuestion.optionC = splitOptions[2].trim();
            if (splitOptions.length >= 4) currentQuestion.optionD = splitOptions[3].trim();

            currentQuestion.type = "SINGLE";
        } else {
            // No options found -> SUBJECTIVE
            currentQuestion.text = textAndOptionsBlock;
            currentQuestion.type = "SUBJECTIVE";
            currentQuestion.optionA = null;
            currentQuestion.optionB = null;
            currentQuestion.optionC = null;
            currentQuestion.optionD = null;
        }

        // Defaults
        currentQuestion.difficulty = "INTERMEDIATE";
        currentQuestion.examTag = "Regex Parsed";
        currentQuestion.hasDiagram = false;
        currentQuestion.correct = ""; // Regex can't reliably determine correct answer unless explicitly marked

        questions.push(currentQuestion as ExtractedQuestion);
    };

    while ((match = questionStartRegex.exec(cleanText)) !== null) {
        if (currentQuestion) {
            processLastQuestion(match.index);
        }

        currentQuestion = {};
        currentNumber = match[1];
        lastIndex = match.index + match[0].length; // Start of content
    }

    // Process the final block
    if (currentQuestion) {
        processLastQuestion(text.length);
    }

    // --- Post-Processing: Extract Answer Key ---
    // The Answer Key often appears at the end of the document, appended to the last question.
    // It can be split into multiple blocks: "Que 1..15 Ans ... Que 16..30 Ans ..."
    if (questions.length > 0) {
        const lastQ = questions[questions.length - 1];

        // 1. Identify the Answer Key Chunk
        // Look for "ANSWER KEY" or pattern "Que. 1" near the end
        // We'll search in Option D and Text
        let potentialKeyText = "";
        let foundInField: "optionD" | "text" | null = null;
        let splitIndex = -1;

        // Try to find explicit "ANSWER KEY" Header
        const headerRegex = /(?:CHECK YOUR GRASP|ANSWER KEY|Answer Key)/i;

        if (lastQ.optionD && headerRegex.test(lastQ.optionD)) {
            potentialKeyText = lastQ.optionD;
            foundInField = "optionD";
            splitIndex = lastQ.optionD.search(headerRegex);
        } else if (headerRegex.test(lastQ.text)) {
            potentialKeyText = lastQ.text;
            foundInField = "text";
            splitIndex = lastQ.text.search(headerRegex);
        }

        // Fallback: proper "Que. 1" pattern if header missing
        if (!foundInField) {
            const quePattern = /Que\.?\s*1\s+\d+/i;
            if (lastQ.optionD && quePattern.test(lastQ.optionD)) {
                potentialKeyText = lastQ.optionD;
                foundInField = "optionD";
                splitIndex = lastQ.optionD.search(quePattern);
            } else if (quePattern.test(lastQ.text)) {
                potentialKeyText = lastQ.text;
                foundInField = "text";
                splitIndex = lastQ.text.search(quePattern);
            }
        }

        if (foundInField && potentialKeyText && splitIndex !== -1) {
            const keyBlock = potentialKeyText.substring(splitIndex);
            console.log("Found Answer Key Block (Length):", keyBlock.length);

            // 2. Parse all "Ans. A B C..." segments in the block
            // We ignore the "Que. 1 2 3" numbers because they are often malformed (1 0 for 10)
            // We assume the ANSWERS are listed in valid order (A B C D...)

            // Regex to find "Ans . A B C ..." blocks
            // Captures the sequence of letters after "Ans"
            const ansBlockRegex = /(?:Ans|Answer)\.?\s*([A-D\s]+)(?:Que|Doc|Page|$)/gi;
            let allAnswers: string[] = [];

            let match;
            while ((match = ansBlockRegex.exec(keyBlock)) !== null) {
                const lettersStr = match[1];
                // Extract single letters A-D
                const letters = lettersStr.match(/[A-D]/gi);
                if (letters) {
                    allAnswers.push(...letters);
                }
            }

            if (allAnswers.length > 0) {
                console.log(`Extracted ${allAnswers.length} answers from key.`);

                // 3. Apply answers to questions
                // Heuristic: Map 1-to-1. 
                // If we have 30 questions and 30 answers, perfect.
                questions.forEach((q, idx) => {
                    if (idx < allAnswers.length) {
                        const ansLetter = allAnswers[idx].toUpperCase();
                        // Only overwrite if not already set (or if regex set it to empty)
                        // But usually Key is authoritative.

                        let fullAns = "";
                        if (ansLetter === 'A') fullAns = q.optionA || "Option A";
                        if (ansLetter === 'B') fullAns = q.optionB || "Option B";
                        if (ansLetter === 'C') fullAns = q.optionC || "Option C";
                        if (ansLetter === 'D') fullAns = q.optionD || "Option D";

                        q.correct = `(${ansLetter}) ${fullAns}`;
                    }
                });

                // 4. CLEANUP: Truncate the garbage from the last question
                const cleanStr = potentialKeyText.substring(0, splitIndex).trim();
                if (foundInField === "optionD") {
                    lastQ.optionD = cleanStr;
                } else {
                    lastQ.text = cleanStr;
                }
                // Remove trailing "D:" or similar artifacts if checking Option D left it empty? 
                // Usually fine.
            }
        }
    }

    return questions;
}
