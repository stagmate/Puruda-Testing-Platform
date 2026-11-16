"use client"

import { signOutTo } from "@/components/session-guard"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
    return (
        <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => signOutTo("signed_out")}
        >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
        </Button>
    )
}
