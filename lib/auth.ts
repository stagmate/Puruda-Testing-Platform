import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { compare, hash } from "bcryptjs"
import { randomBytes } from "crypto"
import { NextAuthOptions } from "next-auth"
import { SESSION_POLICY } from "@/lib/session-policy"
import { createSession, signOutSession } from "@/lib/session-store"
import { clientIp, lockedForMinutes, recordLoginAttempt } from "@/lib/login-throttle"
import { normalizeIndianMobile } from "@/lib/phone"
import { verifyOtp, OTP_MESSAGES } from "@/lib/otp"

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
        }),
        // Free PYQ practice: sign up or log in with a phone number and an SMS code.
        CredentialsProvider({
            id: "phone-otp",
            name: "Phone",
            credentials: {
                phone: { label: "Phone", type: "tel" },
                code: { label: "Code", type: "text" },
                purpose: { label: "Purpose", type: "text" },
                name: { label: "Name", type: "text" },
            },
            async authorize(credentials, req) {
                const phone = normalizeIndianMobile(credentials?.phone)
                const code = (credentials?.code ?? "").trim()
                const purpose = credentials?.purpose === "SIGNUP" ? "SIGNUP" : "LOGIN"
                if (!phone || !/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code from the SMS.")

                const ip = clientIp(req?.headers)
                const wait = await lockedForMinutes(phone, ip)
                if (wait > 0) throw new Error(`Too many failed attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`)

                const check = await verifyOtp(phone, purpose, code)
                await recordLoginAttempt(phone, ip, check === "ok")
                if (check !== "ok") throw new Error(OTP_MESSAGES[check])

                let user = (await db.phoneAccount.findUnique({ where: { phone }, include: { user: true } }))?.user ?? null
                if (!user && purpose === "SIGNUP") {
                    const name = (credentials?.name ?? "").trim().replace(/\s+/g, " ")
                    if (name.length < 2 || name.length > 80) throw new Error("Enter your name (2 to 80 characters).")
                    // No password: learners always sign in with an SMS code.
                    const password = await hash(randomBytes(32).toString("hex"), 10)
                    user = await db.user.create({ data: { name, role: "LEARNER", password, phoneAccount: { create: { phone } } } })
                }
                if (!user) throw new Error("No account uses this number yet. Sign up first.")
                if (user.role !== "LEARNER") throw new Error("This number belongs to a staff or institute account. Use email sign-in.")

                const sid = await createSession(user, { ip, userAgent: (req?.headers?.["user-agent"] as string | undefined) ?? null })
                return { id: user.id, email: user.email, name: user.name, role: user.role, sid }
            },
        }),
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
