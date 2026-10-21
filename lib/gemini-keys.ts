// Gemini API keys come from the environment, never from source code.
// Set GEMINI_API_KEYS to a comma-separated list to spread load across keys,
// or set GOOGLE_API_KEY for a single key.
function loadKeys(): string[] {
    const raw = [process.env.GEMINI_API_KEYS, process.env.GOOGLE_API_KEY]
        .filter(Boolean)
        .join(",")
    return Array.from(new Set(raw.split(",").map(k => k.trim()).filter(Boolean)))
}

export const GEMINI_KEYS: string[] = loadKeys()

export function getRotatedKey(): string {
    if (GEMINI_KEYS.length === 0) return ""
    // Random pick: round-robin state doesn't survive across serverless instances.
    return GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)]
}

export function getAllKeys(): string[] {
    return GEMINI_KEYS
}
