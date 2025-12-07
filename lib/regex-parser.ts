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

    // Regex for Section Headers
    // e.g. "Comprehension # 1", "TRUE / FALSE", "EXERCISE-02"
    const sectionHeaderRegex = /\n\s*((?:Comprehension|Section|Part|Exercise|True\s*\/|Fill\s*in|Match|Assertion|Subjective|Brain\s*Teasers|Miscellaneous)[\w\s\-\#\.]*)\s*\n/gi;

    // We need to interleave section detection with question detection.
    // Easiest is to scan for Sections first and build a map of "StartIndex -> SectionName".

    const sectionMap = new Map<number, string>();
    let secMatch;
    while ((secMatch = sectionHeaderRegex.exec(cleanText)) !== null) {
        sectionMap.set(secMatch.index, secMatch[1].trim());
    }

    // Helper to get section for a given index
    const getSectionAt = (idx: number) => {
        let bestSec = "General";
        let bestPos = -1;
        for (const [pos, name] of sectionMap.entries()) {
            if (pos < idx && pos > bestPos) {
                bestPos = pos;
                bestSec = name;
            }
        }
        return bestSec;
    };

    let match;
    let lastIndex = 0;
    let currentQuestion: Partial<ExtractedQuestion> & { _tempNumber?: string, _isSolvedExample?: boolean, _section?: string } | null = null;

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
        currentQuestion.examTag = currentQuestion._isSolvedExample ? "Solved Example" : (currentQuestion._section || "Regex Parsed");
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
        const currentSec = getSectionAt(match.index);

        currentQuestion = {
            _tempNumber: number,
            _isSolvedExample: isSolvedExample,
            _section: currentSec
        };
        lastIndex = match.index + match[0].length;
    }

    // Process the final block
    if (currentQuestion) {
        processLastQuestion(text.length);
    }

    // --- Post-Processing: Extract Answer Key with Sections ---

    // Data Structure: Section -> { QNum -> Answer }
    const scopedKeyMap = new Map<string, Map<string, string>>();

    const normalizeSection = (s: string) => s.toLowerCase().replace(/[\s\-\#\.]/g, "");

    // 1. Scan Text for Answer Keys
    const keyHeaderRegex = /(?:CHECK YOUR GRASP|ANSWER KEY|Answer Key|BRAIN TEASERS)/gi;
    let keyMatch;

    // We scan the raw text for Key Blocks to handle them linearly
    while ((keyMatch = keyHeaderRegex.exec(cleanText)) !== null) {
        const keyStartIndex = keyMatch.index;
        // Heuristic: Key block goes until next SectionHeader or End
        // Find next section header that is NOT consistent with being INSIDE the key (e.g. "True/False" IS inside the key usually)
        // Actually, usually Key is at end. Let's just grab 5000 chars?
        const keyBlock = cleanText.substring(keyStartIndex, keyStartIndex + 5000); // Limit lookhead
        console.log("Found Answer Key Block at", keyStartIndex);

        // Parse Keys within this block
        // Look for Section Headers INSIDE the Key Block
        // e.g. "True / False \n 1. T"

        const innerSectionRegex = /(?:Comprehension|Section|Part|Exercise|True\s*\/|Fill\s*in|Match|Assertion|Subjective|Brain\s*Teasers|Miscellaneous)[\w\s\-\#\.]*/gi;

        // Split keyBlock by sections
        let currentKeySection = "General";
        let lastKeyPos = 0;
        let innerMatch;

        // If Key block starts with text before first section, that's "General" (or belongs to previous section)

        const processKeySegment = (segment: string, sectionName: string) => {
            // Parse "1. A", "1. T", "1 -> A"
            // Regex: Number ... Answer
            // Matches "1. T", "1. (A)", "1 -> A", "1 A"
            // Answer tokens: A-D, T, F, Words?
            const qaRegex = /(\d+)\s*[\.:\)]\s*([A-DA-d\s,]+|T|F|True|False)/g;
            let m;

            if (!scopedKeyMap.has(normalizeSection(sectionName))) {
                scopedKeyMap.set(normalizeSection(sectionName), new Map());
            }
            const map = scopedKeyMap.get(normalizeSection(sectionName))!;

            while ((m = qaRegex.exec(segment)) !== null) {
                const qNum = m[1];
                const ans = m[2].trim();
                // Validate Answer (A-D, T, F)
                if (/^[A-Da-d\,\s]+$|^T$|^F$|^True$|^False$/i.test(ans)) {
                    map.set(qNum, ans.toUpperCase().replace(/\s/g, "")); // condensed "A,C"
                }
            }
        };

        while ((innerMatch = innerSectionRegex.exec(keyBlock)) !== null) {
            const segment = keyBlock.substring(lastKeyPos, innerMatch.index);
            processKeySegment(segment, currentKeySection);

            currentKeySection = innerMatch[0].trim();
            lastKeyPos = innerMatch.index + innerMatch[0].length;
        }
        // Last segment
        processKeySegment(keyBlock.substring(lastKeyPos), currentKeySection);
    }

    // Also try embedded keys in questions (from previous turn logic)
    // If we didn't find any Keys via global scan, use the per-question logic?
    // Let's rely on the Scoped Map first.

    if (scopedKeyMap.size > 0) {
        console.log("Scoped Key Map:", Array.from(scopedKeyMap.keys()));

        const exerciseQuestions = questions.filter(q => !(q as any)._isSolvedExample);

        exerciseQuestions.forEach(q => {
            const num = (q as any)._tempNumber;
            const sec = (q as any)._section || "General";

            // Try Exact Match
            let map = scopedKeyMap.get(normalizeSection(sec));

            // Try Fuzzy Match (keywords)
            if (!map) {
                // e.g. Question sec "Comprehension # 1", Key sec "Comprehension"
                const normSec = normalizeSection(sec);
                for (const [keySecName, m] of scopedKeyMap.entries()) {
                    if (normSec.includes(keySecName) || keySecName.includes(normSec)) {
                        map = m;
                        break;
                    }
                }
            }
            // Try General if question has no specific section or match failed
            if (!map) map = scopedKeyMap.get("general");

            if (num && map && map.has(num)) {
                const ansLetter = map.get(num);
                q.correct = `(${ansLetter})`;

                // Append text for MCQs
                if (ansLetter && /^[A-D]$/.test(ansLetter)) {
                    if (ansLetter === 'A') q.correct += " " + (q.optionA || "");
                    if (ansLetter === 'B') q.correct += " " + (q.optionB || "");
                    if (ansLetter === 'C') q.correct += " " + (q.optionC || "");
                    if (ansLetter === 'D') q.correct += " " + (q.optionD || "");
                }
            }
        });
    }

    // FINAL FILTER: Return ONLY the Unsolved ones as requested by user
    return questions.filter(q => !(q as any)._isSolvedExample);
}
