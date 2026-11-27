"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Loader2, Smartphone, ShieldCheck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Mode = "SIGNUP" | "LOGIN"

/** Two steps: name (sign-up) + phone, then the 6-digit SMS code. */
export function PhoneOtpForm({ mode, notice }: { mode: Mode; notice?: string }) {
    const router = useRouter()
    const [step, setStep] = useState<"details" | "code">("details")
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [code, setCode] = useState("")
    const [sentTo, setSentTo] = useState("")
    const [devMode, setDevMode] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<{ text: string; link?: { href: string; label: string } } | null>(null)
    const [resendIn, setResendIn] = useState(0)

    useEffect(() => {
        if (resendIn <= 0) return
        const t = setTimeout(() => setResendIn(s => s - 1), 1000)
        return () => clearTimeout(t)
    }, [resendIn])

    const sendCode = async () => {
        setError(null)
        if (mode === "SIGNUP" && name.trim().length < 2) return setError({ text: "Enter your full name." })
        if (!/^[6-9]\d{9}$/.test(phone)) return setError({ text: "Enter your 10-digit mobile number." })
        setBusy(true)
        const res = await fetch("/api/pyq/otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, purpose: mode }),
        }).catch(() => null)
        const data = await res?.json().catch(() => null)
        setBusy(false)
        if (!res?.ok) {
            const link = data?.code === "EXISTS" ? { href: "/pyq/login", label: "Log in" } : data?.code === "NO_ACCOUNT" ? { href: "/pyq/signup", label: "Sign up free" } : undefined
            return setError({ text: data?.error || "Couldn't send the code. Check your connection and try again.", link })
        }
        setSentTo(data.to)
        setDevMode(!!data.devMode)
        setStep("code")
        setCode("")
        setResendIn(30)
    }

    const verify = async () => {
        setError(null)
        if (!/^\d{6}$/.test(code)) return setError({ text: "Enter the 6-digit code from the SMS." })
        setBusy(true)
        const res = await signIn("phone-otp", { phone, code, purpose: mode, name: name.trim(), redirect: false })
        if (!res || res.error) {
            setBusy(false)
            return setError({ text: res?.error && res.error !== "CredentialsSignin" ? res.error : "That code didn't work. Try again." })
        }
        router.replace("/practice")
    }

    return (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-6 space-y-1 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    {step === "details" ? <Smartphone className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </span>
                <h1 className="text-2xl font-bold text-slate-900">
                    {step === "code" ? "Enter the code" : mode === "SIGNUP" ? "Create your free account" : "Log in with your phone"}
                </h1>
                <p className="text-sm text-slate-500">
                    {step === "code"
                        ? <>We sent a 6-digit code by SMS to <b className="text-slate-700">+91 {sentTo}</b>.</>
                        : mode === "SIGNUP" ? "Practise JEE previous-year questions as mock tests. Free." : "We'll text you a one-time code."}
                </p>
            </div>

            {notice && step === "details" && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">{notice}</p>}

            <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (step === "details") sendCode(); else verify() }}>
                {step === "details" ? (
                    <>
                        {mode === "SIGNUP" && (
                            <div className="space-y-1.5">
                                <label htmlFor="pyq-name" className="text-sm font-medium text-slate-800">Full name</label>
                                <Input id="pyq-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aarav Sharma" autoComplete="name" maxLength={80} className="h-12 text-base" autoFocus />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label htmlFor="pyq-phone" className="text-sm font-medium text-slate-800">Mobile number</label>
                            <div className="flex h-12 items-center rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                                <span className="border-r px-3 text-base text-slate-500">+91</span>
                                <input
                                    id="pyq-phone"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    placeholder="98765 43210"
                                    className="h-full flex-1 bg-transparent px-3 text-base outline-none"
                                    autoFocus={mode === "LOGIN"}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-1.5">
                        <label htmlFor="pyq-code" className="text-sm font-medium text-slate-800">6-digit code</label>
                        <Input
                            id="pyq-code"
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="••••••"
                            className="h-14 text-center text-2xl tracking-[0.5em]"
                            autoFocus
                        />
                        {devMode && <p className="text-xs text-amber-700">Development mode: SMS isn&apos;t set up, so the code is printed in the server log.</p>}
                    </div>
                )}

                {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {error.text}{error.link && <> <Link href={error.link.href} className="font-semibold underline">{error.link.label}</Link></>}
                    </p>
                )}

                <Button type="submit" disabled={busy} className="h-12 w-full bg-indigo-600 text-base font-semibold hover:bg-indigo-700">
                    {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                    {step === "details" ? "Send OTP" : mode === "SIGNUP" ? "Verify & create account" : "Verify & log in"}
                </Button>

                {step === "code" && (
                    <div className="flex items-center justify-between text-sm">
                        <button type="button" onClick={() => { setStep("details"); setError(null) }} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
                            <ArrowLeft className="h-4 w-4" />Change number
                        </button>
                        <button type="button" onClick={sendCode} disabled={resendIn > 0 || busy} className="font-medium text-indigo-600 disabled:text-slate-400">
                            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                        </button>
                    </div>
                )}
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
                {mode === "SIGNUP"
                    ? <>Already have an account? <Link href="/pyq/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link></>
                    : <>New here? <Link href="/pyq/signup" className="font-semibold text-indigo-600 hover:underline">Create a free account</Link></>}
            </p>
            <p className="mt-2 text-center text-xs text-slate-400">Puruda Classes students and staff: <Link href="/login" className="underline">sign in with email</Link></p>
        </div>
    )
}
