import { PrintableTest } from "@/components/printable-test"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ testId: string }>
    searchParams: Promise<{ mode?: string }>
}

export default async function PrintTestPage(props: PageProps) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const test = await db.test.findUnique({
        where: { id: params.testId },
        include: {
            questions: true,
            course: true
        }
    })

    if (!test) return notFound()

    const mode = (searchParams.mode as "student" | "teacher" | "key") || "student"

    return (
        <div className="min-h-screen bg-white text-black">
            <PrintableTest test={test} mode={mode} />
        </div>
    )
}
