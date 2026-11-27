import type { Metadata } from "next"
import { PhoneOtpForm } from "@/components/pyq/phone-otp-form"

export const metadata: Metadata = { title: "Sign up free · JEE PYQ practice" }

export default function PyqSignupPage() {
    return (
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50 px-4 py-12">
            <PhoneOtpForm mode="SIGNUP" />
        </main>
    )
}
