import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { checkSession } from "@/lib/session-store"

export const ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const
export type Role = (typeof ROLES)[number]

export type SessionUser = {
    id: string
    email?: string | null
    name?: string | null
    role: Role
}

export function isRole(value: unknown): value is Role {
    return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

/**
 * The signed-in user, or null. Besides the login cookie, the server-side session
 * record must still be valid (not signed out, closed, idle or expired).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions)
    const user = session?.user as (Partial<SessionUser> & { sid?: string }) | undefined
    if (!user?.id || !isRole(user.role)) return null
    const check = await checkSession(user.sid, user.id)
    if (!check.ok) return null
    return { id: user.id, email: user.email, name: user.name, role: user.role }
}

type AuthResult =
    | { user: SessionUser; response?: undefined }
    | { user?: undefined; response: NextResponse }

/**
 * Checks that the caller is logged in and has one of the given roles.
 * Usage: const auth = await requireRole(["ADMIN"]); if (auth.response) return auth.response
 * Pass an empty list to allow any logged-in user.
 */
export async function requireRole(roles: readonly Role[] = []): Promise<AuthResult> {
    const user = await getSessionUser()
    if (!user) {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
        return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
    }
    return { user }
}

export const STAFF: readonly Role[] = ["ADMIN", "TEACHER"]
export const ADMIN_ONLY: readonly Role[] = ["ADMIN"]
