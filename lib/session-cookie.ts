import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/** The user id and session id from the login cookie (not yet checked against the database). */
export async function readSessionCookie(): Promise<{ userId: string; sid: string } | null> {
    const session = await getServerSession(authOptions)
    const u = session?.user as { id?: unknown; sid?: unknown } | undefined
    return typeof u?.id === "string" && typeof u?.sid === "string" ? { userId: u.id, sid: u.sid } : null
}
