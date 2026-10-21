"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Menu, X } from "lucide-react"
import { Sidebar } from "@/components/sidebar"

// Top bar + slide-in drawer for small screens. The drawer reuses the desktop sidebar.
export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Close the drawer whenever the route changes (including browser back).
    const location = `${pathname}?${searchParams.toString()}`
    const [lastLocation, setLastLocation] = useState(location)
    if (location !== lastLocation) {
        setLastLocation(location)
        if (open) setOpen(false)
    }

    // Close if the screen grows past the breakpoint while open.
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)")
        const onChange = () => mq.matches && setOpen(false)
        mq.addEventListener("change", onChange)
        return () => mq.removeEventListener("change", onChange)
    }, [])

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:hidden">
                <DialogPrimitive.Trigger
                    className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </DialogPrimitive.Trigger>
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 text-transparent bg-clip-text">
                    Puruda
                </span>
            </header>

            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 md:hidden" />
                <DialogPrimitive.Content
                    className="fixed inset-y-0 left-0 z-[100] w-72 max-w-[85vw] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left md:hidden"
                >
                    <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">Dashboard sections</DialogPrimitive.Description>
                    <Sidebar onNavigate={() => setOpen(false)} />
                    <DialogPrimitive.Close
                        className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}
