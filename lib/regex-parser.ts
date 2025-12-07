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
    // Capture Group 1: Prefix (Ex/Example/Q/Question) - Optional
    // Capture Group 2: Number
    const questionStartRegex = /\n\s*(?:(Q\.?|Question|Ex\.?|Example)\s*)?(\d+)\s*[\.:]\s+/gi;

    let match;
    let lastIndex = 0;
    let currentQuestion: Partial<ExtractedQuestion> & { _tempNumber?: string, _isSolvedExample?: boolean } | null = null;

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

        // If it was already flagged as a Solved Example (by prefix "Ex"), we expect a solution.
        // Even if not flagged, if we find "Sol.", it serves as one.
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
            const rest = textAndOptionsBlock.substring(idxA); // Options block

            // Heuristic splitting of options
            // Comprehensive split regex
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
        currentQuestion.examTag = currentQuestion._isSolvedExample ? "Solved Example" : "Regex Parsed";
        currentQuestion.hasDiagram = false;
        currentQuestion.correct = ""; // Regex can't reliably determine correct answer unless explicitly marked

        questions.push(currentQuestion as ExtractedQuestion);
    };

    while ((match = questionStartRegex.exec(cleanText)) !== null) {
        if (currentQuestion) {
            processLastQuestion(match.index);
        }

        const prefix = match[1] || ""; // e.g. "Ex", "Example", "Q"
        const number = match[2];     // e.g. "1", "12"

        // Detect if it is a Solved Example based on Prefix
        const isSolvedExample = /Ex|Example/i.test(prefix);

        currentQuestion = {
            _tempNumber: number,
            _isSolvedExample: isSolvedExample
        };
        lastIndex = match.index + match[0].length;
    }

    // Process the final block
    if (currentQuestion) {
        processLastQuestion(text.length);
    }

    // --- Post-Processing: Extract Answer Key ---
    // The Answer Key often appears at the end of the document, OR at the end of sections.
    // It can be split into multiple blocks: "Que 1..15 Ans ... Que 16..30 Ans ..."
    // We need to find ALL Answer Key blocks in the text and apply them.

    // 1. Scan ALL questions for Answer Key blocks attached to them (usually in text or optionD)
    // We iterate backwards because keys are usually at the end of a section (attached to the last Q of that section).

    const keyMap = new Map<string, string>(); // Global map of QNum -> Answer

    for (const q of questions) {
        let potentialKeyText = "";
        let foundInField: "optionD" | "text" | null = null;
        let splitIndex = -1;

        // Try to find explicit "ANSWER KEY" Header or "Que 1" pattern
        const headerRegex = /(?:CHECK YOUR GRASP|ANSWER KEY|Answer Key|BRAIN TEASERS)/i;
        // Also look for the "Que 1 ... Ans" table pattern even without header
        const tablePattern = /Que\.?\s*(?:1\s+|16\s+)/i;

        const checkField = (text: string | null) => {
            if (!text) return -1;
            let idx = text.search(headerRegex);
            if (idx === -1) idx = text.search(tablePattern);
            return idx;
        };

        if (q.optionD) {
            const idx = checkField(q.optionD);
            if (idx !== -1) {
                potentialKeyText = q.optionD;
                foundInField = "optionD";
                splitIndex = idx;
            }
        }

        if (!foundInField && checkField(q.text) !== -1) {
            potentialKeyText = q.text;
            foundInField = "text";
            splitIndex = checkField(q.text);
        }

        if (foundInField && potentialKeyText && splitIndex !== -1) {
            const keyBlock = potentialKeyText.substring(splitIndex);
            console.log("Found Answer Key Block inside Question", (q as any)._tempNumber);

            // Regex to find "Ans . A B C ..." blocks
            const ansBlockRegex = /(?:Ans|Answer)\.?\s*([A-D\s,]+)(?:Que|Doc|Page|$)/gi;

            let match;
            // We need to correlate these with the "Que ... " numbers if possible.
            // But first, let's extract the answer tokens.
            // Robust Tokenizer: handles "A", "A,B", "A, B", "A B"
            // We look for: (A or B or C or D) optionally followed by (, and more letters)
            // Regex: /[a-dA-D](?:\s*,\s*[a-dA-D])*/g 
            // But wait, "A B" means Q1=A, Q2=B. "A,B" means Q1=A,B.
            // We must distinguish space vs comma.

            // Strategy:
            // 1. Find the "Que" line to count how many questions.
            // 2. Find the "Ans" line and split.
            // Simpler: Just look for comma-groups.

            while ((match = ansBlockRegex.exec(keyBlock)) !== null) {
                const lettersStr = match[1];

                // Split by whitespace to get tokens? 
                // If "A,B" is present, it shouldn't have spaces inside ideally.
                // If "A, B", split by space gives "A," and "B".
                // We need a smart regex to capture "A" or "A,B" or "A, B" as one token?
                // No, standard typically is "A B C" or "A,B C".

                // Let's try matching [A-D](?:,[A-D])*
                // This matches "A" or "A,B" or "A,B,C".
                const answerTokens = lettersStr.match(/[A-D](?:\s*,\s*[A-D])*/gi);

                if (answerTokens) {
                    // We need to know WHICH questions these belong to.
                    // We can try to finding the "Que ..." line preceding this "Ans ..." line.
                    // But strictly, we can assume the Key applies to the 'Unsolved' questions Preceding this block?
                    // Or better: The questions in the key usually range 1..N.
                    // Let's assume sequential 1..N for the collected tokens in this Block.

                    // Challenge: "Que 16..21". Tokens start at 16.
                    // We need to parse the numbers from the "Que" row.

                    // Try to parse the entire Table if possible.
                    // "Que 1 2 ... \n Ans A B ..."

                    // Fallback: If we find N tokens, and we have questions with numbers matching the range...
                    // Let's just collect all tokens in order and map them to "1, 2, 3..." relative to this block? 
                    // No, numbers might be "16, 17...".

                    // LET'S PARSE THE "Que" ROWS too.
                    // Look for "Que ... " inside keyBlock.
                    // extract numbers.
                }
            }

            // REVISED PARSING FOR BLOCKS
            // We'll extract pairs of (Que Line, Ans Line).
            // Que Line: /Que\.?\s*((?:\d+\s*)+)/
            // Ans Line: /Ans\.?\s*((?:[A-D,\s]+))/

            const lines = keyBlock.split(/\n|Que\./); // Split roughly
            // This is getting parsing-heavy.
            // Alternative: "Smart token stitching" 1..N
            // Capture all numbers in the block -> [1, 2, ... 16 ... ]
            // Capture all answer tokens -> [A, B, ... C ... ]

            const allNums = keyBlock.match(/\b\d+\b/g); // Simple numbers
            const allAns = keyBlock.match(/[A-D](?:\s*,\s*[A-D])*/gi); // Answers "A" or "A,B"

            // Filter nums to be reasonable question numbers (e.g. < 200)
            const cleanNums = allNums?.filter(n => parseInt(n) < 200 && parseInt(n) > 0);

            if (cleanNums && allAns && Math.abs(cleanNums.length - allAns.length) < 5) {
                // If counts are seemingly aligned
                const count = Math.min(cleanNums.length, allAns.length);
                for (let i = 0; i < count; i++) {
                    keyMap.set(cleanNums[i], allAns[i].toUpperCase().replace(/\s/g, ""));
                }
            }

            // CLEANUP
            const cleanStr = potentialKeyText.substring(0, splitIndex).trim();
            if (foundInField === "optionD") {
                q.optionD = cleanStr;
            } else {
                q.text = cleanStr;
            }
        }
    }

    if (keyMap.size > 0) {
        console.log(`Global Key Map Constructed: ${keyMap.size} entries.`);
        // Apply to Unsolved
        const exerciseQuestions = questions.filter(q => !(q as any)._isSolvedExample);
        exerciseQuestions.forEach(q => {
            const num = (q as any)._tempNumber;
            if (num && keyMap.has(num)) {
                const ansLetter = keyMap.get(num);
                // Format: (A) Text or (A,C) Text (if multiple?)
                q.correct = `(${ansLetter})`;

                // If single letter, append text
                if (ansLetter && ansLetter.length === 1 && !ansLetter.includes(",")) {
                    if (ansLetter === 'A') q.correct += " " + (q.optionA || "");
                    if (ansLetter === 'B') q.correct += " " + (q.optionB || "");
                    if (ansLetter === 'C') q.correct += " " + (q.optionC || "");
                    if (ansLetter === 'D') q.correct += " " + (q.optionD || "");
                }
            }
        });
    }

    // FINAL FILTER: Return ONLY the Unsolved ones as requested by user?
    return questions.filter(q => !(q as any)._isSolvedExample);
}
