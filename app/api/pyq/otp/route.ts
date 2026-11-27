import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeIndianMobile, maskPhone } from "@/lib/phone"
import { issueOtp } from "@/lib/otp"
import { smsConfigured, smsDevMode } from "@/lib/sms"
import { clientIp } from "@/lib/login-throttle"

// Sends a sign-up or log-in code by SMS. Body: { phone, purpose: "SIGNUP" | "LOGIN" }
export async function POST(req: Request) {
    if (!smsConfigured() && !smsDevMode()) {
        return NextResponse.json({ error: "Phone sign-up isn't available yet. Please try again later." }, { status: 503 })
    }
    const body = await req.json().catch(() => null)
    const phone = normalizeIndianMobile(body?.phone)
    const purpose = body?.purpose === "SIGNUP" ? "SIGNUP" : "LOGIN"
    if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })

    const existing = (await db.phoneAccount.findUnique({ where: { phone }, select: { user: { select: { role: true } } } }))?.user
    if (purpose === "SIGNUP" && existing) {
        return NextResponse.json({ error: "This number already has an account. Log in instead.", code: "EXISTS" }, { status: 409 })
    }
    if (purpose === "LOGIN" && !existing) {
        return NextResponse.json({ error: "No account uses this number yet. Sign up first.", code: "NO_ACCOUNT" }, { status: 404 })
    }
    if (existing && existing.role !== "LEARNER") {
        return NextResponse.json({ error: "This number belongs to a staff or institute account. Use email sign-in." }, { status: 409 })
    }

    const result = await issueOtp(phone, purpose, clientIp(req.headers))
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ sent: true, to: maskPhone(phone), devMode: smsDevMode() })
}
