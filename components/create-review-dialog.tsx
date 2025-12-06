"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Star, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"

export function CreateReviewDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [students, setStudents] = useState<any[]>([])
    const [selectedStudent, setSelectedStudent] = useState("")
    const [rating, setRating] = useState("5")
    const router = useRouter()

    useEffect(() => {
        if (open) {
            // Fetch users with role STUDENT
            fetch("/api/admin/users?role=STUDENT")
                .then(res => res.json())
                .then(data => {
                    // Check if data is array OR if data.data is array (paginated response)
                    const users = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

                    if (users.length > 0 || Array.isArray(users)) {
                        setStudents(users)
                    } else {
                        console.error("Users API structure mismatch:", data)
                        setStudents([])
                    }
                })
                .catch(err => {
                    console.error(err)
                    setStudents([])
                })
        }
    }, [open])

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const feedback = formData.get("feedback")
        const subject = formData.get("subject")

        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                body: JSON.stringify({
                    studentId: selectedStudent,
                    feedback,
                    rating,
                    subjectId: subject // Treating as simple string for now if schema allows or API handles
                })
            })

            if (!res.ok) throw new Error("Failed to submit review")

            setOpen(false)
            alert("Review submitted for approval!")
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Error submitting review")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <UserPlus className="h-4 w-4" />
                    Write Review
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Student Performance Review</DialogTitle>
                    <DialogDescription>
                        Submit qualitative feedback. This will be reviewed by an Admin before being visible to the student.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Student</Label>
                        <Select onValueChange={setSelectedStudent} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Search student..." />
                            </SelectTrigger>
                            <SelectContent>
                                {students.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Subject (Optional)</Label>
                            <Input name="subject" placeholder="e.g. Physics" />
                        </div>
                        <div className="space-y-2">
                            <Label>Rating (1-10)</Label>
                            <Select value={rating} onValueChange={setRating}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(10)].map((_, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Detailed Feedback</Label>
                        <Textarea
                            name="feedback"
                            required
                            placeholder="Write your observation on student's performance..."
                            className="min-h-[100px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !selectedStudent}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Review
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
