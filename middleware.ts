import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        // Not authenticated
        if (!token) {
            // Free PYQ learners sign in with their phone; everyone else with email.
            return NextResponse.redirect(new URL(path.startsWith("/practice") ? "/pyq/login" : "/login", req.url))
        }

        // Role-based protection: Strict checks
        if (path.startsWith("/admin") && token.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/teacher") && token.role !== "TEACHER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/print") && token.role !== "ADMIN" && token.role !== "TEACHER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }
        if (path.startsWith("/practice") && token.role !== "LEARNER" && token.role !== "ADMIN") {
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
            // Let signed-out visitors to /practice through to the function above,
            // which sends them to the phone login instead of the email one.
            authorized: ({ token, req }) => !!token || req.nextUrl.pathname.startsWith("/practice"),
        },
        secret: process.env.NEXTAUTH_SECRET,
    }
)

export const config = {
    matcher: [
        "/admin/:path*",
        "/teacher/:path*",
        "/student/:path*",
        "/print/:path*",
        "/practice/:path*",
    ]
}
