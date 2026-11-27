import { describe, expect, it } from "vitest"
import { normalizeIndianMobile, formatPhone, maskPhone } from "./phone"
import { OTP, otpState, resendWaitSeconds } from "./otp-policy"

describe("normalizeIndianMobile", () => {
    it("accepts common ways of writing an Indian mobile", () => {
        for (const raw of ["9876543210", "+91 98765 43210", "919876543210", "098765-43210", "(+91) 98765.43210"]) {
            expect(normalizeIndianMobile(raw)).toBe("+919876543210")
        }
    })
    it("rejects anything else", () => {
        for (const raw of ["12345", "5876543210", "98765432101", "+1 2025550123", "", null]) {
            expect(normalizeIndianMobile(raw)).toBeNull()
        }
    })
    it("formats and masks", () => {
        expect(formatPhone("+919876543210")).toBe("98765 43210")
        expect(maskPhone("+919876543210")).toBe("98xxxxxx10")
    })
})

describe("otp policy", () => {
    const now = Date.parse("2026-11-27T10:00:00Z")
    it("makes you wait before resending", () => {
        expect(resendWaitSeconds(null, now)).toBe(0)
        expect(resendWaitSeconds(new Date(now - 10_000), now)).toBe(20)
        expect(resendWaitSeconds(new Date(now - 31_000), now)).toBe(0)
    })
    it("rejects used, expired and over-guessed codes", () => {
        const fresh = { expiresAt: new Date(now + 60_000), consumedAt: null, attempts: 0 }
        expect(otpState(fresh, now)).toBe("ok")
        expect(otpState({ ...fresh, consumedAt: new Date(now) }, now)).toBe("used")
        expect(otpState({ ...fresh, attempts: OTP.maxVerifyAttempts }, now)).toBe("too-many-attempts")
        expect(otpState({ ...fresh, expiresAt: new Date(now - 1) }, now)).toBe("expired")
    })
})
