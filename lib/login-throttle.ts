import { db } from "@/lib/db"

// Repeated wrong passwords lock the account (and, separately, the network address)
// for a while, so passwords can't be guessed by trying thousands of them.
export const LOGIN_LIMITS = {
    windowMs: 15 * 60 * 1000,
    perEmail: 5,   // wrong passwords for one account in the window
    perIp: 20,     // wrong passwords from one address in the window
}

export function clientIp(headers: Headers | Record<string, string | string[] | undefined> | undefined): string | null {
    const get = (k: string) => {
        if (!headers) return undefined
        if (headers instanceof Headers) return headers.get(k) ?? undefined
        const v = headers[k]
        return Array.isArray(v) ? v[0] : v
    }
    // On Vercel the first x-forwarded-for entry is the client
    return get("x-forwarded-for")?.split(",")[0]?.trim() || get("x-real-ip") || null
}

/** Minutes until the email or address may try again, or 0 if not locked. */
export async function lockedForMinutes(email: string, ip: string | null, now = new Date()): Promise<number> {
    const since = new Date(now.getTime() - LOGIN_LIMITS.windowMs)
    const [byEmail, byIp] = await Promise.all([
        db.loginAttempt.findMany({ where: { email, success: false, createdAt: { gte: since } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        ip ? db.loginAttempt.findMany({ where: { ipAddress: ip, success: false, createdAt: { gte: since } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }) : Promise.resolve([]),
    ])
    const waitFor = (list: { createdAt: Date }[], limit: number) => {
        if (list.length < limit) return 0
        // Unlocks when the oldest counted failure leaves the window
        const unlockAt = list[list.length - limit].createdAt.getTime() + LOGIN_LIMITS.windowMs
        return Math.max(1, Math.ceil((unlockAt - now.getTime()) / 60000))
    }
    return Math.max(waitFor(byEmail, LOGIN_LIMITS.perEmail), waitFor(byIp, LOGIN_LIMITS.perIp))
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
    await db.loginAttempt.create({ data: { email, ipAddress: ip, success } })
    if (success) {
        // A correct password clears this account's failures
        await db.loginAttempt.deleteMany({ where: { email, success: false } })
    }
}
