// Simple Round-Robin / Random storage for keys
// In production, use a proper secrets manager or database
export const GEMINI_KEYS = [
    "AIzaSyBDcWzPaa6iZgVLtZdigwd--xBLQj1Hmrs",
    "AIzaSyDwVKh4nwzIBur96lkp3htrsmGKtHRBadQ",
    "AIzaSyDNmly6X5Km1-n3lqTsXLwjH2MTujkS6-A",
    "AIzaSyDnYFUt18n6YOHkPVMqYOkyyg_xcj19SAM"
].filter(key => key && key.length > 0) as string[];

export function getRotatedKey(): string {
    if (GEMINI_KEYS.length === 0) return "";
    // Random selection for better distribution in serverless environment (round-robin state is hard to keep)
    return GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
}

export function getAllKeys(): string[] {
    return GEMINI_KEYS;
}
