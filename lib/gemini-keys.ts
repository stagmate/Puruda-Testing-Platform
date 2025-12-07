// Simple Round-Robin / Random storage for keys
// In production, use a proper secrets manager or database
export const GEMINI_KEYS = [
    "AIzaSyBDcWzPaa6iZgVLtZdigwd--xBLQj1Hmrs",
    "AIzaSyDwVKh4nwzIBur96lkp3htrsmGKtHRBadQ",
    "AIzaSyDNmly6X5Km1-n3lqTsXLwjH2MTujkS6-A",
    "AIzaSyDnYFUt18n6YOHkPVMqYOkyyg_xcj19SAM",
    "AIzaSyBk0Ha5lgLZHeD02hg_-oniZVSEAPOiFZk",
    "AIzaSyBFMCf5MVvoU1PO9rbRJMo_yaQC4KamOXc",
    "AIzaSyDD1geP-ZJEvmb3azpvrDowCn-rFsZqg18",
    "AIzaSyCqx8asQm5fnu7EDsdjNygDmo_74-cjVP8",
    "AIzaSyCUULzdO-upQUMJCRUh3ZzzBkpEX_s7vuA",
    "AIzaSyAFkRpC_Nr1GXauZoJeepdaIhBbdzn2EnE",
    "AIzaSyCSqvWR2y6zs9DDmqDirBZy0pZMWCpTlnc",
    "AIzaSyBgffNAEYdljPUMk0njOzSrVA9srBp_jiI",
    "AIzaSyDjwXfooOyUfVnh9csBm4CbvVu1jriuByE",
    "AIzaSyDD4L_UikxOw2Z8lgVqvLqpfYC3x1I-5Wo"
].filter(key => key && key.length > 0) as string[];

export function getRotatedKey(): string {
    if (GEMINI_KEYS.length === 0) return "";
    // Random selection for better distribution in serverless environment (round-robin state is hard to keep)
    return GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
}

export function getAllKeys(): string[] {
    return GEMINI_KEYS;
}
