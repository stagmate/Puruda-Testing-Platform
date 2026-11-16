"use client"

import { SessionProvider } from "next-auth/react"
import { SessionGuard } from "@/components/session-guard"

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <SessionProvider>
            <SessionGuard>{children}</SessionGuard>
        </SessionProvider>
    )
}
