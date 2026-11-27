// Indian mobile numbers, stored as E.164 (+91XXXXXXXXXX).

/** "+91 98765-43210", "09876543210", "9876543210" → "+919876543210"; null if not a valid Indian mobile. */
export function normalizeIndianMobile(raw: unknown): string | null {
    if (typeof raw !== "string") return null
    let digits = raw.replace(/[\s\-().]/g, "")
    if (digits.startsWith("+91")) digits = digits.slice(3)
    else if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2)
    else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1)
    return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

/** "+919876543210" → "98765 43210" for display. */
export function formatPhone(e164: string | null | undefined): string {
    if (!e164) return ""
    const d = e164.replace(/^\+91/, "")
    return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : e164
}

/** "+919876543210" → "98xxxxxx10", for messages that shouldn't show the full number. */
export function maskPhone(e164: string): string {
    const d = e164.replace(/^\+91/, "")
    return `${d.slice(0, 2)}xxxxxx${d.slice(-2)}`
}
