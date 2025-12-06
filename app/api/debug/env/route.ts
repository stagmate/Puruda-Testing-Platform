import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        checks: {
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
            nextAuthUrl: process.env.NEXTAUTH_URL || "(not set)",
            nodeEnv: process.env.NODE_ENV
        },
        message: "Missing keys: " +
            (!process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET, " : "") +
            (!process.env.GOOGLE_API_KEY ? "GOOGLE_API_KEY" : "")
    })
}
