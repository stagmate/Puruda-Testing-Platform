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
        const solMatch = fullBlock.match(/\n\s*(?:Sol\.?|Solution|Ans\.?|Answer)[\.:]\s*([\s\S]*)/i);
        if (solMatch) {
            currentQuestion.solution = solMatch[1].trim();
            // Remove solution from full text to find options
        }

        // 2. Look for Options (a), (b), (c), (d) or A., B., C., D. or (A), (B)
        // Regex relaxed to allow inline options (not just start of line)
        // Matches "(A)" or "(a)" or "A." or "A)" preceded by newline OR space
        const optionARegex = /(?:^|\s|\n)(?:\([aA]\)|[aA]\.|[aA]\))(?:\s+|$)/;

        const idxA = fullBlock.search(optionARegex);

        if (idxA !== -1) {
            // Options exist
            currentQuestion.text = fullBlock.substring(0, idxA).trim();
            const rest = fullBlock.substring(idxA);

            // Heuristic splitting of options
            // Split by (b)/(B)/B. etc.
            // We use a comprehensive split regex: ((a)|(A)|a.|A.|a)|A))
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
            currentQuestion.text = solMatch ? fullBlock.substring(0, solMatch.index).trim() : fullBlock;
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
    // The Answer Key often appears at the end of the document, which means it might be appended to the D option of the last question.
    // Pattern: "Que. 1 2 3 ... Ans. A B C ..."
    if (questions.length > 0) {
        const lastQ = questions[questions.length - 1];

        // Check if last question has the answer key in its option D or text
        const answerKeyRegex = /Que\.?\s*((?:\d+\s*)+)\s*Ans\.?\s*((?:[A-D]\s*)+)/i;
        let potentialKeyText = "";
        let foundInField: "optionD" | "text" | null = null;

        if (lastQ.optionD && answerKeyRegex.test(lastQ.optionD)) {
            potentialKeyText = lastQ.optionD;
            foundInField = "optionD";
        } else if (answerKeyRegex.test(lastQ.text)) { // Fallback if no options
            potentialKeyText = lastQ.text;
            foundInField = "text";
        }

        if (foundInField && potentialKeyText) {
            const match = potentialKeyText.match(answerKeyRegex);
            if (match) {
                const qNumStr = match[1];
                const ansStr = match[2];

                // Extract all numbers
                const qNums = qNumStr.match(/\d+/g);
                // Extract all answers
                const answers = ansStr.match(/[A-D]/gi);

                if (qNums && answers && qNums.length === answers.length) {
                    console.log(`Found Answer Key with ${qNums.length} entries.`);

                    // 1. Create a Map
                    const ansMap = new Map<string, string>();
                    qNums.forEach((num, idx) => {
                        ansMap.set(num, answers[idx].toUpperCase());
                    });

                    // 2. Apply to ALL questions
                    questions.forEach((q, idx) => {
                        // We assume questions are in order 1..N, but let's be safe?
                        // Ideally we tracked 'currentNumber' in the loop. 
                        // But for now, let's assume index+1 maps to the key number.
                        // Or better: We didn't save the qNumber in the object. 
                        // Let's assume sequential mapping for now as heurisic.

                        const qNum = (idx + 1).toString();
                        if (ansMap.has(qNum)) {
                            const ansLetter = ansMap.get(qNum);
                            if (ansLetter) {
                                // Map letter to full option text if possible
                                let fullAns = "";
                                if (ansLetter === 'A') fullAns = q.optionA || "Option A";
                                if (ansLetter === 'B') fullAns = q.optionB || "Option B";
                                if (ansLetter === 'C') fullAns = q.optionC || "Option C";
                                if (ansLetter === 'D') fullAns = q.optionD || "Option D";

                                q.correct = `(${ansLetter}) ${fullAns}`;
                            }
                        }
                    });

                    // 3. CLEANUP: Remove the Answer Key text from the Last Question
                    const cleanStr = potentialKeyText.replace(match[0], "").trim();
                    if (foundInField === "optionD") {
                        lastQ.optionD = cleanStr;
                    } else {
                        lastQ.text = cleanStr;
                    }
                }
            }
        }
    }

    return questions;
}
