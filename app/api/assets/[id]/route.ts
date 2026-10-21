import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

// Serves an uploaded image. Any logged-in user may view (students see question
// images during tests). Assets never change, so they can be cached for good.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireRole()
    if (auth.response) return auth.response

    const { id } = await params
    const asset = await db.asset.findUnique({ where: { id }, select: { mimeType: true, data: true } })
    if (!asset) return new NextResponse("Not found", { status: 404 })

    return new NextResponse(new Uint8Array(asset.data), {
        headers: {
            "Content-Type": asset.mimeType,
            "Cache-Control": "private, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    })
}
