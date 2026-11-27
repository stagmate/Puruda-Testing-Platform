// Limits for SMS one-time codes. Kept separate so they can be unit-tested.

export const OTP = {
    length: 6,
    ttlMs: 5 * 60 * 1000,          // a code works for 5 minutes
    maxVerifyAttempts: 5,          // wrong guesses before the code is burnt
    resendAfterMs: 30 * 1000,      // wait before asking for another code
    maxPerPhonePerHour: 5,
    maxPerIpPerHour: 20,
} as const

/** Seconds to wait before another code can be sent, or 0. */
export function resendWaitSeconds(lastSentAt: Date | null, now = Date.now()): number {
    if (!lastSentAt) return 0
    const wait = OTP.resendAfterMs - (now - lastSentAt.getTime())
    return wait > 0 ? Math.ceil(wait / 1000) : 0
}

export type OtpCheck = "ok" | "expired" | "used" | "too-many-attempts" | "wrong"

/** Whether a stored code can still be accepted (the hash comparison is done by the caller). */
export function otpState(row: { expiresAt: Date; consumedAt: Date | null; attempts: number }, now = Date.now()): Exclude<OtpCheck, "wrong"> {
    if (row.consumedAt) return "used"
    if (row.attempts >= OTP.maxVerifyAttempts) return "too-many-attempts"
    if (row.expiresAt.getTime() <= now) return "expired"
    return "ok"
}
