// Sends one-time codes by SMS through MSG91 (https://msg91.com, OTP API v5).
// We generate the code ourselves and pass it to MSG91, so verification works
// the same whatever the provider. Configure in the environment:
//   MSG91_AUTH_KEY     - MSG91 auth key
//   MSG91_TEMPLATE_ID  - DLT-approved OTP template id (the template uses ##OTP##)
// Without them, codes are printed to the server log in development, and phone
// sign-up is switched off in production.

export function smsConfigured() {
    return !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID)
}

/** In development without MSG91, codes are logged instead of sent. */
export function smsDevMode() {
    return !smsConfigured() && process.env.NODE_ENV !== "production"
}

export async function sendOtpSms(phoneE164: string, code: string): Promise<{ ok: boolean; error?: string }> {
    if (!smsConfigured()) {
        if (smsDevMode()) {
            console.info(`[sms:dev] OTP for ${phoneE164}: ${code}`)
            return { ok: true }
        }
        return { ok: false, error: "SMS is not set up" }
    }
    const mobile = phoneE164.replace(/^\+/, "") // MSG91 wants 91XXXXXXXXXX
    const url = new URL("https://control.msg91.com/api/v5/otp")
    url.searchParams.set("template_id", process.env.MSG91_TEMPLATE_ID!)
    url.searchParams.set("mobile", mobile)
    url.searchParams.set("otp", code)
    url.searchParams.set("otp_expiry", "5") // minutes
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { authkey: process.env.MSG91_AUTH_KEY!, "Content-Type": "application/json" },
            body: "{}",
            signal: AbortSignal.timeout(10_000),
        })
        const body = await res.json().catch(() => null) as { type?: string; message?: string } | null
        if (!res.ok || body?.type === "error") {
            console.error("[sms] MSG91 refused the OTP:", res.status, body?.message)
            return { ok: false, error: "Couldn't send the SMS" }
        }
        return { ok: true }
    } catch (error) {
        console.error("[sms] MSG91 request failed:", error)
        return { ok: false, error: "Couldn't send the SMS" }
    }
}
