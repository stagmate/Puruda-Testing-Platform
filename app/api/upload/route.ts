import { NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import path from "path"
import { requireRole, STAFF } from "@/lib/api-auth"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
// Only plain image formats. SVG is excluded because it can carry scripts.
const ALLOWED_TYPES: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
}

// Note: files are written to public/uploads on the server's disk. On hosts with
// ephemeral disks (e.g. Vercel) they will not persist; use object storage there.
export async function POST(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    try {
        const formData = await req.formData()
        const file = formData.get("file")

        if (!file || typeof file === "string") {
            return new NextResponse("No file uploaded", { status: 400 })
        }

        const ext = ALLOWED_TYPES[file.type]
        if (!ext) return new NextResponse("Only PNG, JPEG, GIF or WebP images are allowed", { status: 400 })
        if (file.size > MAX_BYTES) return new NextResponse("Image is too large (max 5 MB)", { status: 413 })

        const buffer = Buffer.from(await file.arrayBuffer())

        // Server-generated name: never trust the client's filename (path traversal, odd characters).
        const filename = `${Date.now()}-${randomUUID()}.${ext}`
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        await mkdir(uploadDir, { recursive: true })
        await writeFile(path.join(uploadDir, filename), buffer)

        return NextResponse.json({ url: `/uploads/${filename}` })
    } catch (error) {
        console.error("Upload error:", error)
        return new NextResponse("Error uploading file", { status: 500 })
    }
}
