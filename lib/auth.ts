import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
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
            async authorize(credentials) {
                console.log("[AUTH_DEBUG] Attempting login for:", credentials?.email)

                if (!credentials?.email || !credentials?.password) {
                    console.log("[AUTH_DEBUG] Missing credentials")
                    return null
                }

                const user = await db.user.findUnique({
                    where: { email: credentials.email },
                })

                if (!user) {
                    console.log("[AUTH_DEBUG] User not found:", credentials.email)
                    return null
                }

                console.log("[AUTH_DEBUG] User found, verifying password...")
                const isValid = await compare(credentials.password, user.password)

                if (!isValid) {
                    console.log("[AUTH_DEBUG] Password invalid for user:", credentials.email)
                    return null
                }

                console.log("[AUTH_DEBUG] Login successful for:", credentials.email)

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
}
