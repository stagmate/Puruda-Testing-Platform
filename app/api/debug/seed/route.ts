import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"

export async function GET() {
    try {
        console.log("🌱 STARTING HARD RESET SEED...")

        // Passwords
        const adminPassword = await hash("admin123", 12)
        const userPassword = await hash("password123", 12)

        // 1. Force Reset Admin
        // Delete first to ensure clean state
        try {
            await db.user.delete({ where: { email: "admin@gmail.com" } }).catch(() => { })
        } catch (e) { }

        const admin = await db.user.create({
            data: {
                email: "admin@gmail.com",
                name: "Super Admin",
                role: "ADMIN",
                password: adminPassword
            }
        })
        console.log("Details: Created admin@gmail.com")

        // 2. Default Users
        const usersToSeed = [
            { email: "teacher@puruda.com", role: "TEACHER", name: "Teacher User" },
            { email: "student@puruda.com", role: "STUDENT", name: "Student User" },
            { email: "student2@puruda.com", role: "STUDENT", name: "Test Student 2" }
        ]

        for (const u of usersToSeed) {
            await db.user.upsert({
                where: { email: u.email },
                update: { password: userPassword, role: u.role }, // Ensure password/role is reset
                create: {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    password: userPassword
                }
            })
        }

        // 3. Ensure Metadata Exists
        const subjectsData = ["Physics", "Chemistry", "Mathematics", "Biology"]
        for (const name of subjectsData) {
            await db.subject.upsert({ where: { name }, update: {}, create: { name } })
        }

        const course = await db.course.upsert({
            where: { name: "JEE Mains 2025" },
            update: {},
            create: {
                name: "JEE Mains 2025",
                batches: { create: [{ name: "Morning" }] }
            }
        })

        return NextResponse.json({
            status: "Success",
            message: "Database seeded. Admin reset complete.",
            credentials: {
                admin: { email: "admin@gmail.com", pass: "admin123" },
                others: { pass: "password123" }
            }
        })

    } catch (error) {
        console.error("Seed Fatal Error:", error)
        return NextResponse.json({ error: "Seed Failed", details: String(error) }, { status: 500 })
    }
}
