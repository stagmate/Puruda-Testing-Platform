"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            // 1. Authenticate with NextAuth
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (res?.error) {
                console.error("Login Failed:", res.error)
                setError("Login failed. Check console for details or verify credentials.")
                setLoading(false)
                return
            }

            if (!res?.ok) {
                setError(`Server Error (${res?.status}). Please try again later.`)
                setLoading(false)
                return
            }

            // 2. Fetch Session to determine redirect
            // Note: We use a small delay or retry pattern if session is lagging, but usually fetch is fine.
            const sessionRes = await fetch("/api/auth/session")
            const session = await sessionRes.json()

            if (!session || !session.user) {
                setError("Session creation failed. Please try again.")
                setLoading(false)
                return
            }

            const role = session.user.role

            // 3. Redirect based on role
            if (role === "ADMIN") {
                router.push("/admin")
            } else if (role === "TEACHER") {
                router.push("/teacher")
            } else if (role === "STUDENT") {
                router.push("/student")
            } else {
                router.push("/") // Fallback
            }

            router.refresh()

        } catch (err) {
            console.error("Login Error:", err)
            setError("An unexpected error occurred.")
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Puruda Platform</CardTitle>
                    <CardDescription className="text-center">Sign in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded text-sm">
                                {error}
                            </div>
                        )}
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-muted-foreground">
                    <p>Protected System • Authorized Access Only</p>
                </CardFooter>
            </Card>
        </div>
    )
}
