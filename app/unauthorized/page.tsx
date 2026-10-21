import Link from "next/link"

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-2xl font-bold">Access denied</h1>
            <p className="text-muted-foreground">Your account doesn&apos;t have permission to view this page.</p>
            <Link href="/login" className="text-indigo-600 underline">Back to login</Link>
        </div>
    )
}
