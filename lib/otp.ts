// Issuing and checking SMS one-time codes (server only).

import { createHmac, randomInt, timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { OTP, otpState, resendWaitSeconds, type OtpCheck } from "@/lib/otp-policy"
import { sendOtpSms } from "@/lib/sms"

export type OtpPurpose = "SIGNUP" | "LOGIN"

function hashCode(phone: string, code: string) {
    // Keyed so a leaked table can't be brute-forced offline without the secret.
    return createHmac("sha256", process.env.NEXTAUTH_SECRET || "otp").update(`${phone}:${code}`).digest("hex")
}

export async function issueOtp(phone: string, purpose: OtpPurpose, ip: string | null): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const [last, perPhone, perIp] = await Promise.all([
        db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        db.otpCode.count({ where: { phone, createdAt: { gt: hourAgo } } }),
        ip ? db.otpCode.count({ where: { ipAddress: ip, createdAt: { gt: hourAgo } } }) : Promise.resolve(0),
    ])
    const wait = resendWaitSeconds(last?.createdAt ?? null)
    if (wait > 0) return { ok: false, status: 429, error: `Please wait ${wait} seconds before asking for another code.` }
    if (perPhone >= OTP.maxPerPhonePerHour || perIp >= OTP.maxPerIpPerHour) {
        return { ok: false, status: 429, error: "Too many codes requested. Please try again in an hour." }
    }

    const code = String(randomInt(0, 10 ** OTP.length)).padStart(OTP.length, "0")
    const row = await db.otpCode.create({
        data: { phone, purpose, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + OTP.ttlMs), ipAddress: ip?.slice(0, 64) ?? null },
    })
    const sent = await sendOtpSms(phone, code)
    if (!sent.ok) {
        await db.otpCode.delete({ where: { id: row.id } }).catch(() => {})
        return { ok: false, status: 502, error: "We couldn't send the SMS. Please try again in a minute." }
    }
    return { ok: true }
}

/** Checks the latest code for this phone and purpose, and uses it up if it matches. */
export async function verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<OtpCheck> {
    const row = await db.otpCode.findFirst({ where: { phone, purpose }, orderBy: { createdAt: "desc" } })
    if (!row) return "expired"
    const state = otpState(row)
    if (state !== "ok") return state

    const expected = Buffer.from(row.codeHash, "hex")
    const given = Buffer.from(hashCode(phone, String(code).trim()), "hex")
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
        await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } })
        return "wrong"
    }
    // Use it up; the condition stops the same code being used twice at once.
    const used = await db.otpCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } })
    return used.count === 1 ? "ok" : "used"
}

export const OTP_MESSAGES: Record<Exclude<OtpCheck, "ok">, string> = {
    wrong: "That code isn't right. Check the SMS and try again.",
    expired: "That code has expired. Ask for a new one.",
    used: "That code has already been used. Ask for a new one.",
    "too-many-attempts": "Too many wrong tries. Ask for a new code.",
}
