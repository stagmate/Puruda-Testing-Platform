"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, User } from "lucide-react"
import { AIInsightCard } from "@/components/ai-insight-card"

export function StudentPerformanceExplorer() {
    const [query, setQuery] = useState("")
    const [users, setUsers] = useState<any[]>([])
    const [selectedUser, setSelectedUser] = useState<any>(null)

    // Debounced Search or simpler effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                fetch(`/api/admin/users?search=${query}&role=STUDENT`)
                    .then(res => res.json())
                    .then(data => setUsers(data.data || [])) // Fix: Extract .data
                    .catch(console.error)
            } else {
                setUsers([])
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:h-[500px] flex flex-col">
                <CardHeader>
                    <CardTitle>Find Student</CardTitle>
                    <CardDescription>Search by name or email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="e.g. kushagra"
                            className="pl-8"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>

                    <div className="border rounded-md flex-1 overflow-y-auto">
                        {users.length === 0 && query && (
                            <div className="p-4 text-center text-sm text-muted-foreground">No students found.</div>
                        )}
                        {users.map(u => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedUser?.id === u.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-b'}`}
                            >
                                <div className="bg-slate-200 p-2 rounded-full">
                                    <User className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                    <div className="font-medium">{u.name || "Unnamed"}</div>
                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {selectedUser ? (
                    <>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                                <CardDescription>{selectedUser.email}</CardDescription>
                            </CardHeader>
                        </Card>

                        {/* Reuse the AI Card - passing userId prop tells backend to fetch THEIR data */}
                        <AIInsightCard userId={selectedUser.id} />
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50/50">
                        Select a student to view analysis
                    </div>
                )}
            </div>
        </div>
    )
}
