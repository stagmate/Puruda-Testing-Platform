import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, STAFF } from "@/lib/api-auth"
import { sniffImageType } from "@/lib/image-type"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Images are stored in the database and served from /api/assets/<id>, because
// serverless hosts (e.g. Vercel) have a read-only, non-persistent disk.
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const formData = await req.formData()
        const file = formData.get("file")

        if (!file || typeof file === "string") {
            return new NextResponse("No file uploaded", { status: 400 })
        }
        if (file.size > MAX_BYTES) return new NextResponse("Image is too large (max 5 MB)", { status: 413 })

        const buffer = Buffer.from(await file.arrayBuffer())
        const mimeType = sniffImageType(buffer)
        if (!mimeType) return new NextResponse("Only PNG, JPEG, GIF or WebP images are allowed", { status: 400 })

        const asset = await db.asset.create({
            data: { mimeType, size: buffer.length, data: buffer, uploadedBy: auth.user.id },
            select: { id: true },
        })

        return NextResponse.json({ url: `/api/assets/${asset.id}` })
    } catch (error) {
        console.error("Upload error:", error)
        return new NextResponse("Error uploading file", { status: 500 })
    }
}
