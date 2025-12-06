import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/hash"
import { getServerSession } from "next-auth"
// import { authOptions } from "../auth/[...nextauth]/route" // Need to export authOptions properly

// Helper to check admin
async function isAdmin() {
    const session = await getServerSession()
    return session?.user?.email === "admin@puruda.com" // Simplistic check for now, ideally check role from token
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const search = searchParams.get("search")
    const role = searchParams.get("role")

    const where: any = {}
    if (search) {
        where.OR = [
            { name: { contains: search } }, // Case insensitive in SQLite/Postgres usually needs mode: 'insensitive'
            { email: { contains: search } }
        ]
    }
    if (role) {
        where.role = role
    }

    const [users, total] = await Promise.all([
        db.user.findMany({
            where,
            skip,
            take: limit,
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        }),
        db.user.count()
    ])

    return NextResponse.json({
        data: users,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    })
}

export async function POST(req: Request) {
    //   if (!await isAdmin()) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { email, password, name, role } = body

        const hashedPassword = await hashPassword(password)

        const user = await db.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        return new NextResponse("Error creating user", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    //   if (!await isAdmin()) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return new NextResponse("ID required", { status: 400 })

    await db.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
