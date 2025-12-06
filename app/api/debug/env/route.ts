import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        checks: {
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            nextAuthUrl: process.env.NEXTAUTH_URL || "(not set)",
            nodeEnv: process.env.NODE_ENV
        },
        message: "If hasNextAuthSecret is false, Login will fail with 500 error."
    })
}
