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
    // e.g. "Comprehension # 1", "TRUE / FALSE", "EXERCISE-02", "Exercise-05(A)"
    const sectionHeaderRegex = /\n\s*((?:Comprehension|Section|Part|Exercise|True\s*\/|Fill\s*in|Match|Assertion|Subjective|Brain\s*Teasers|Miscellaneous|Previous\s*Year|Archives?)[\w\s\-\#\.\(\)\[\]]*)\s*\n/gi;

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

        let fullBlock = cleanText.substring(lastIndex, endIndex).trim();

        // --- NOISE CLEANUP ---
        // Headers/Footers often appear between questions
        // e.g. "EXERCISE-01 CHECK YOUR GRASP...", "Page (2) Break"
        const noiseRegex = /\n\s*(?:EXERCISE-\d+|CHECK YOUR GRASP|Page\s*\(\d+\)|Break|SELECT THE CORRECT|ONLY ONE CORRECT)[\s\S]*?(?=\n|$)/gi;
        // Be careful not to delete the actual question text if it's on the same line.
        // Usually headers are distinct lines.
        fullBlock = fullBlock.replace(noiseRegex, "\n");

        // Also remove specific known noise lines that might be inline
        fullBlock = fullBlock.replace(/CHECK YOUR GRASP.*\n?/gi, "");
        fullBlock = fullBlock.replace(/SELECT THE CORRECT ALTERNATIVE.*\n?/gi, "");
        fullBlock = fullBlock.trim();

        // Split block into Question Text, Options, Solution
        // 1. Look for Solution
        // Expanded keywords: Sol, Solution, Ans, Answer, Hint, Note, Explanation, Reason
        const solMatch = fullBlock.match(/\n\s*(?:Sol\.?|Solution|Ans\.?|Answer|Hint|Note|Explanation|Reason)[\.:]\s*([\s\S]*)/i);
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

        // Detect Option Format: (A) or (1)
        // Check for (A) first
        let optionRegex = /(?:^|\s|\n)(?:\([aA]\)|[aA]\.|[aA]\))(?:\s+|$)/;
        let isNumericOptions = false;

        if (textAndOptionsBlock.search(optionRegex) === -1) {
            // Check for (1)
            // Be careful not to match "1." as the question number.
            // We look for (1) or 1) specifically?
            // " (1) " is safer.
            const numOptRegex = /(?:^|\s|\n)(?:\(1\)|1\))(?:\s+|$)/;
            if (textAndOptionsBlock.search(numOptRegex) !== -1) {
                optionRegex = numOptRegex;
                isNumericOptions = true;
            }
        }

        const idxA = textAndOptionsBlock.search(optionRegex);

        if (idxA !== -1) {
            // Options exist
            currentQuestion.text = textAndOptionsBlock.substring(0, idxA).trim();
            const rest = textAndOptionsBlock.substring(idxA); // Options block

            // Heuristic splitting of options
            // Comprehensive split regex
            let splitRegex;
            if (isNumericOptions) {
                splitRegex = /(?:^|\s|\n)(?:\([1234]\)|[1234]\))(?:\s+|$)/;
            } else {
                splitRegex = /(?:^|\s|\n)(?:\([abcdABCD]\)|[abcdABCD]\.|[abcdABCD]\))(?:\s+|$)/;
            }

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

    // --- Post-Processing: Scoped Answer Keys with Support for Tables ---
    const scopedKeyMap = new Map<string, Map<string, string>>();

    // Normalization that handles leading zeros and punctuation: "Exercise-05(A)" -> "exercise5a"
    const normalizeSection = (s: string) => {
        let clean = s.toLowerCase().replace(/[\s\-\#\.]/g, ""); // "exercise05(a)"
        // replace "0" if followed by digit? "05" -> "5"
        clean = clean.replace(/0(\d)/g, "$1");
        // Remove parens/brackets if they contain just 1 letter? No keep them but stripped?
        // "exercise5(a)" -> "exercise5a"
        clean = clean.replace(/[\(\)\[\]]/g, "");
        return clean;
    };

    // 1. Scan Text for Answer Keys
    // REMOVED "CHECK YOUR GRASP" as it causes false positives (it's often just a header)
    const keyHeaderRegex = /(?:ANSWER KEY|Answer Key|BRAIN TEASERS)/gi;
    let keyMatch;

    // We scan the raw text for Key Blocks to handle them linearly
    while ((keyMatch = keyHeaderRegex.exec(cleanText)) !== null) {
        const keyStartIndex = keyMatch.index;
        // Heuristic: Key block goes until next SectionHeader or End
        // Find next section header that is NOT consistent with being INSIDE the key (e.g. "True/False" IS inside the key usually)
        // Actually, usually Key is at end. Let's just grab 6000 chars?
        const keyBlock = cleanText.substring(keyStartIndex, keyStartIndex + 6000);
        console.log("Found Answer Key Block at", keyStartIndex);

        // Parse Keys within this block
        // Look for Section Headers INSIDE the Key Block
        // e.g. "True / False \n 1. T"

        const innerSectionRegex = /(?:Comprehension|Section|Part|Exercise|True\s*\/|Fill\s*in|Match|Assertion|Subjective|Brain\s*Teasers|Miscellaneous|Previous\s*Year|Archives?)[\w\s\-\#\.\(\)\[\]]*/gi;

        // Split keyBlock by sections
        let currentKeySection = "General";
        let lastKeyPos = 0;
        let innerMatch;

        // If Key block starts with text before first section, that's "General" (or belongs to previous section)

        const processKeySegment = (segment: string, sectionName: string) => {
            const normSec = normalizeSection(sectionName);
            if (!scopedKeyMap.has(normSec)) {
                scopedKeyMap.set(normSec, new Map());
            }
            const map = scopedKeyMap.get(normSec)!;

            // 1. Try Table Parsing (Row of Que, Row of Ans)
            // Look for "Que ... \n Ans ..."
            const queLineRegex = /Que\.?\s*((?:\d+\s*)+)/i;
            // Ensure Ans line has valid answer tokens
            const ansLineRegex = /(?:Ans|Answer)\.?\s*((?:\d+|[A-D]|\(?[A-D]\)?)+(?:\s+(?:\d+|[A-D]|\(?[A-D]\)?))*)/i;

            // Check if segment contains these clearly
            const queMatch = segment.match(queLineRegex);
            const ansMatch = segment.match(ansLineRegex);

            let tableParsed = false;
            if (queMatch && ansMatch) {
                // Try to align them
                const qNums = queMatch[1].match(/\d+/g);
                // Answers can be '1', '2', 'A', 'B'
                const aTokens = ansMatch[1].match(/[A-Da-d0-9]+/g);

                if (qNums && aTokens && Math.abs(qNums.length - aTokens.length) <= 3) {
                    const count = Math.min(qNums.length, aTokens.length);
                    for (let i = 0; i < count; i++) {
                        map.set(qNums[i], aTokens[i].toUpperCase().replace(/\s/g, ""));
                    }
                    tableParsed = true;
                }
            }

            // 2. Fallback to Pair Parsing
            if (!tableParsed) {
                // Modified regex: Stricter for T/F/True/False to avoid matching "Two" or unrelated words
                // Matches: "1. A", "1 -> A", "1 T", "1 True"
                const qaRegex = /(\d+)\s*(?:[\.:\)]|->)\s*([A-DA-d]+|T|F|True|False|[1234])(?=\s|$|\n)/g;
                let m;
                while ((m = qaRegex.exec(segment)) !== null) {
                    const qNum = m[1];
                    const ans = m[2].trim();

                    // Extra heuristic: If 'T' check if it's 'True' or just random T?
                    // My regex [A-DA-d] is strict. T is T.
                    // But "12 T..." matching "12. Two" -> "12" and "T" from Two?
                    // My regex requires (\d+) then separator [.:)] or ->.
                    // "12 . Two" -> "12" "." "T"wo? Yea "T" is matched by [A-D...T...].
                    // Wait, [A-D] does not match T.
                    // I explicitly added |T|F.

                    // If the answer is just "T" or "F", verify it's standalone?
                    // regex uses (?=\s|$|\n) which enforces T followed by space/end.
                    // "Two" -> "Tw" is not matching. "T" followed by "w".
                    // So "Two" should NOT match.

                    map.set(qNum, ans.toUpperCase().replace(/\s/g, ""));
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
            const normSec = normalizeSection(sec);

            // Try Exact Match
            let map = scopedKeyMap.get(normSec);

            // Try Fuzzy Match (keywords)
            if (!map) {
                // e.g. Question sec "Comprehension # 1", Key sec "Comprehension"
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
                const ansToken = map.get(num); // e.g. "A" or "3"

                // If Numeric Answer (1-4)
                if (/^[1-4]$/.test(ansToken!)) {
                    q.correct = `(${ansToken})`;
                    const idx = parseInt(ansToken!) - 1; // 0-based
                    if (idx === 0) q.correct += " " + (q.optionA || "");
                    if (idx === 1) q.correct += " " + (q.optionB || "");
                    if (idx === 2) q.correct += " " + (q.optionC || "");
                    if (idx === 3) q.correct += " " + (q.optionD || "");
                } else {
                    // Letter Answer
                    q.correct = `(${ansToken})`;
                    if (ansToken === 'A') q.correct += " " + (q.optionA || "");
                    if (ansToken === 'B') q.correct += " " + (q.optionB || "");
                    if (ansToken === 'C') q.correct += " " + (q.optionC || "");
                    if (ansToken === 'D') q.correct += " " + (q.optionD || "");
                }
            }
        });
    }

    // FINAL FILTER: Return ONLY the Unsolved ones as requested by user
    return questions.filter(q => !(q as any)._isSolvedExample);
}
