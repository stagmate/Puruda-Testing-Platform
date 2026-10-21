import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/hash"
import { requireRole, STAFF, ADMIN_ONLY, isRole } from "@/lib/api-auth"

const MAX_PAGE_SIZE = 100

export async function GET(req: Request) {
    const auth = await requireRole(STAFF)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50))
    const skip = (page - 1) * limit

    const search = searchParams.get("search")
    // Teachers may only look up students; admins can filter by any role.
    const role = auth.user.role === "ADMIN" ? searchParams.get("role") : "STUDENT"

    const where: Prisma.UserWhereInput = {}
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
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
        db.user.count({ where })
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
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    try {
        const { email, password, name, role } = await req.json()

        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
            return new NextResponse("Email and password are required", { status: 400 })
        }
        if (password.length < 8) {
            return new NextResponse("Password must be at least 8 characters", { status: 400 })
        }
        if (role !== undefined && !isRole(role)) {
            return new NextResponse("Invalid role", { status: 400 })
        }

        const user = await db.user.create({
            data: {
                email: email.trim(),
                password: await hashPassword(password),
                name,
                role: role ?? "STUDENT",
            },
            // Never send the password hash back to the browser.
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        })

        return NextResponse.json(user)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return new NextResponse("A user with this email already exists", { status: 409 })
        }
        console.error("[USERS_POST]", error)
        return new NextResponse("Error creating user", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await requireRole(ADMIN_ONLY)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return new NextResponse("ID required", { status: 400 })
    if (id === auth.user.id) return new NextResponse("You cannot delete your own account", { status: 400 })

    try {
        await db.user.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") return new NextResponse("User not found", { status: 404 })
            if (error.code === "P2003") {
                return new NextResponse("This user has test results, reviews or assignments and can't be deleted", { status: 409 })
            }
        }
        console.error("[USERS_DELETE]", error)
        return new NextResponse("Error deleting user", { status: 500 })
    }
}
