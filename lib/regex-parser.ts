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
    // Matches: "1.", "Q1.", "Ex. 1", "Example 1", "Question 1" at start of line
    const questionStartRegex = /\n\s*(?:Q\.?|Question|Ex\.?|Example)?\s*(\d+)[\.:]\s+/gi;

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

        // 2. Look for Options (a), (b), (c), (d) or A., B., C., D.
        // This is tricky. We'll look for the LAST occurrence of patterns to define boundaries.
        const optionARegex = /\n\s*(?:\(a\)|[aA]\.|[A]\))\s+/;
        const optionBRegex = /\n\s*(?:\(b\)|[bB]\.|[B]\))\s+/;
        const optionCRegex = /\n\s*(?:\(c\)|[cC]\.|[C]\))\s+/;
        const optionDRegex = /\n\s*(?:\(d\)|[dD]\.|[D]\))\s+/;

        const idxA = fullBlock.search(optionARegex);

        if (idxA !== -1) {
            // Options exist
            currentQuestion.text = fullBlock.substring(0, idxA).trim();
            const rest = fullBlock.substring(idxA);

            // Heuristic splitting of options
            const splitOptions = rest.split(/\n\s*(?:\([abcd]\)|[abcdA-D]\.|[A-D]\))\s+/);
            // splitOptions[0] is empty or whitespace
            if (splitOptions.length > 1) currentQuestion.optionA = splitOptions[1]?.trim() || "";
            if (splitOptions.length > 2) currentQuestion.optionB = splitOptions[2]?.trim() || "";
            if (splitOptions.length > 3) currentQuestion.optionC = splitOptions[3]?.trim() || "";
            if (splitOptions.length > 4) currentQuestion.optionD = splitOptions[4]?.trim() || "";
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

    return questions;
}
