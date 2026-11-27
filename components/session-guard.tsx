"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { signOut, useSession } from "next-auth/react"

// Keeps the server-side session in step with the browser:
// - checks in every ~20 s while a tab is open (with whether the user did anything),
// - tells the server when a tab closes, so closing the site signs out within seconds,
// - signs out and shows the login page as soon as the server says the session ended.

const TAB_KEY = "puruda.tab"       // set in sessionStorage: survives reloads of this tab, not a new tab
const CHANNEL = "puruda-session"   // lets open tabs keep the session alive when one tab closes
const WARN_BEFORE_IDLE_MS = 2 * 60 * 1000

type Ctx = { verified: boolean }
const SessionGuardContext = createContext<Ctx>({ verified: false })
export const useSessionGuard = () => useContext(SessionGuardContext)

const storage = {
    get: () => { try { return sessionStorage.getItem(TAB_KEY) === "1" } catch { return false } },
    set: () => { try { sessionStorage.setItem(TAB_KEY, "1") } catch { /* private mode */ } },
    clear: () => { try { sessionStorage.removeItem(TAB_KEY) } catch { /* ignore */ } },
}

/** Sign out locally and go to the login page, showing why. */
export async function signOutTo(reason?: string) {
    storage.clear()
    try { await signOut({ redirect: false }) } catch { /* already signed out */ }
    // Free PYQ learners sign in with their phone, on their own login page.
    const page = window.location.pathname.startsWith("/practice") ? "/pyq/login" : "/login"
    window.location.replace(reason ? `${page}?reason=${encodeURIComponent(reason)}` : page)
}

export function SessionGuard({ children }: { children: React.ReactNode }) {
    const { status } = useSession()
    const [verified, setVerified] = useState(false)
    const [idleWarnAt, setIdleWarnAt] = useState<number | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const active = useRef(true) // count the page load itself as activity
    const ending = useRef(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const interval = useRef(20_000)

    const beat = useCallback(async () => {
        if (ending.current) return
        const wasActive = active.current
        active.current = false
        try {
            const res = await fetch("/api/session/heartbeat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: wasActive, knownTab: storage.get() }),
                cache: "no-store",
            })
            const data = await res.json().catch(() => ({}))
            if (res.status === 401) {
                ending.current = true
                await signOutTo(data.reason)
                return
            }
            if (res.ok) {
                storage.set()
                setVerified(true)
                if (data.heartbeatMs) interval.current = data.heartbeatMs
                setIdleWarnAt(data.idleLogoutAt ? new Date(data.idleLogoutAt).getTime() - WARN_BEFORE_IDLE_MS : null)
            }
        } catch {
            // Offline or a network blip: keep going; the server still enforces everything.
            active.current = active.current || wasActive
            setVerified(true)
        }
    }, [])

    useEffect(() => {
        if (status !== "authenticated") return
        ending.current = false
        let stopped = false
        // Check in now, then every `interval` (the server says how often)
        const loop = async () => {
            await beat()
            if (!stopped) timer.current = setTimeout(loop, interval.current)
        }
        loop()

        const markActive = () => { active.current = true }
        const activityEvents = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const
        activityEvents.forEach(e => window.addEventListener(e, markActive, { passive: true, capture: true }))

        const onVisible = () => { if (document.visibilityState === "visible") beat() }
        document.addEventListener("visibilitychange", onVisible)

        const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null
        const followUps: ReturnType<typeof setTimeout>[] = []
        if (channel) {
            // Another tab is closing: check in (after its close signal has landed) so this tab keeps the session.
            channel.onmessage = e => {
                if (e.data === "closing") followUps.push(setTimeout(beat, 2_000), setTimeout(beat, 8_000))
            }
        }

        const onPageHide = () => {
            if (ending.current) return
            try { navigator.sendBeacon("/api/session/closing") } catch { /* ignore */ }
            channel?.postMessage("closing")
        }
        window.addEventListener("pagehide", onPageHide)

        return () => {
            activityEvents.forEach(e => window.removeEventListener(e, markActive, { capture: true }))
            document.removeEventListener("visibilitychange", onVisible)
            window.removeEventListener("pagehide", onPageHide)
            followUps.forEach(clearTimeout)
            channel?.close()
            stopped = true
            if (timer.current) clearTimeout(timer.current)
        }
    }, [status, beat])

    // Tick once a second only while the inactivity warning could be showing
    const warning = verified && idleWarnAt !== null && now >= idleWarnAt
    useEffect(() => {
        if (idleWarnAt === null) return
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [idleWarnAt])

    const stay = () => {
        active.current = true
        setIdleWarnAt(null)
        beat()
    }

    const secondsLeft = idleWarnAt !== null ? Math.max(0, Math.round((idleWarnAt + WARN_BEFORE_IDLE_MS - now) / 1000)) : 0

    return (
        <SessionGuardContext.Provider value={{ verified: status === "authenticated" && verified }}>
            {children}
            {warning && (
                <div role="alertdialog" aria-live="assertive" className="fixed inset-x-4 bottom-4 z-[200] mx-auto max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xl sm:inset-x-auto sm:right-6">
                    <p className="font-semibold text-amber-900">Still there?</p>
                    <p className="mt-1 text-sm text-amber-900">
                        For security you&apos;ll be signed out in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} because there&apos;s been no activity.
                    </p>
                    <button type="button" onClick={stay} className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">
                        Stay signed in
                    </button>
                </div>
            )}
        </SessionGuardContext.Provider>
    )
}

/** Shows a placeholder until the session has been confirmed with the server. */
export function SessionGate({ children }: { children: React.ReactNode }) {
    const { verified } = useSessionGuard()
    const { status } = useSession()
    if (status === "authenticated" && verified) return <>{children}</>
    return (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500" role="status">
            Checking your session…
        </div>
    )
}
