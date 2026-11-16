import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { NextAuthOptions } from "next-auth"
import { SESSION_POLICY } from "@/lib/session-policy"
import { createSession, signOutSession } from "@/lib/session-store"
import { clientIp, lockedForMinutes, recordLoginAttempt } from "@/lib/login-throttle"

// Compared against when the email doesn't exist, so a wrong email takes as long
// as a wrong password and response times don't reveal which accounts exist.
const DUMMY_HASH = "$2b$12$2YKp16P7XphqgodovDUsIutKUbjrP9r0KeFbSXo05m6fN0FUBSMgi" // bcrypt (cost 12) of a random throwaway value

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        // The cookie can't outlive the absolute session limit. Whether the session is
        // still valid (closed, idle, signed out) is checked server-side on every request.
        maxAge: Math.floor(SESSION_POLICY.maxAgeMs / 1000),
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                const email = credentials?.email?.trim() ?? ""
                const password = credentials?.password ?? ""
                if (!email || !password || email.length > 254 || password.length > 200) return null

                const ip = clientIp(req?.headers)
                const key = email.toLowerCase()
                const wait = await lockedForMinutes(key, ip)
                if (wait > 0) {
                    // Shown on the login page
                    throw new Error(`Too many failed sign-in attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`)
                }

                const user = await db.user.findUnique({ where: { email } })
                const valid = await compare(password, user?.password ?? DUMMY_HASH)
                await recordLoginAttempt(key, ip, !!user && valid)
                if (!user || !valid) return null

                const sid = await createSession(user, { ip, userAgent: (req?.headers?.["user-agent"] as string | undefined) ?? null })
                return { id: user.id, email: user.email, name: user.name, role: user.role, sid }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = (user as { role?: string }).role
                token.sid = (user as { sid?: string }).sid
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user as { id?: unknown; role?: unknown; sid?: unknown }
                u.id = token.id
                u.role = token.role
                u.sid = token.sid
            }
            return session
        }
    },
    events: {
        // Logging out ends the session on the server too, so a copied cookie stops working.
        async signOut({ token }) {
            await signOutSession(token?.sid as string | undefined)
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}
