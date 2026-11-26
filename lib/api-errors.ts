import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

/** Turn common database errors into a friendly response; anything else is a 500. */
export function dbErrorResponse(error: unknown, what: string, tag: string, duplicate = `A ${what} with that name already exists`) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") return new NextResponse(duplicate, { status: 409 })
        if (error.code === "P2025") return new NextResponse(`${what[0].toUpperCase()}${what.slice(1)} not found`, { status: 404 })
        if (error.code === "P2003") return new NextResponse(`That ${what} is still in use`, { status: 409 })
    }
    console.error(`[${tag}]`, error)
    return new NextResponse(`Couldn't save the ${what}`, { status: 500 })
}

/** A trimmed, non-empty name of at most `max` characters, or null. */
export function cleanName(v: unknown, max = 120): string | null {
    if (typeof v !== "string") return null
    const s = v.trim().replace(/\s+/g, " ")
    return s && s.length <= max ? s : null
}
