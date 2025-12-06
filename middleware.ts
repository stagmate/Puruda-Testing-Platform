import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        // Not authenticated
        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url))
        }

        // Role-based protection: Strict checks
        if (path.startsWith("/admin") && token.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/teacher") && token.role !== "TEACHER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/student") && token.role !== "STUDENT") {
            // Optional: Allow admins to view student pages, else strict
            if (token.role === "ADMIN") return null
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }

        return null
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        secret: process.env.NEXTAUTH_SECRET,
    }
)

export const config = {
    matcher: [
        "/admin/:path*",
        "/teacher/:path*",
        "/student/:path*",
    ]
}
