export const GEMINI_KEYS = [
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY,
    "AIzaSyCmAJpiqcQjFpraVRgsrYmhg-HRnlyp4HU",
    "AIzaSyAE97vL6nKleWv9YtwkSU4ieYR5iaZkBy8"
].filter(key => key && key.length > 0) as string[];

export function getRotatedKey(): string {
    if (GEMINI_KEYS.length === 0) return "";
    // Random selection for better distribution in serverless environment (round-robin state is hard to keep)
    return GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
}

export function getAllKeys(): string[] {
    return GEMINI_KEYS;
}
