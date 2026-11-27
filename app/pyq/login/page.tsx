import type { Metadata } from "next"
import { PhoneOtpForm } from "@/components/pyq/phone-otp-form"

export const metadata: Metadata = { title: "Log in · JEE PYQ practice" }

export default async function PyqLoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
    const { reason } = await searchParams
    return (
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50 px-4 py-12">
            <PhoneOtpForm mode="LOGIN" notice={reason ? "You were signed out. Log in again to continue." : undefined} />
        </main>
    )
}
