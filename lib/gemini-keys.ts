export const GEMINI_KEYS = [
    "AIzaSyC-XRAPxnMrpRR1EsPZr9q2fHJC3eFWiY4",
    "AIzaSyAxxK_I7KRrNk0aezkLqlDLBSiQfNIv0Qs"
].filter(key => key && key.length > 0) as string[];

export function getRotatedKey(): string {
    if (GEMINI_KEYS.length === 0) return "";
    // Random selection for better distribution in serverless environment (round-robin state is hard to keep)
    return GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
}

export function getAllKeys(): string[] {
    return GEMINI_KEYS;
}
