import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return new NextResponse("No file uploaded", { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Unique filename
        const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        const filepath = path.join(uploadDir, filename)

        await writeFile(filepath, buffer)

        // Return public URL
        const url = `/uploads/${filename}`
        return NextResponse.json({ url })
    } catch (error) {
        console.error("Upload error:", error)
        return new NextResponse("Error uploading file", { status: 500 })
    }
}
