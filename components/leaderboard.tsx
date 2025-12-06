"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function Leaderboard({ testId }: { testId: string }) {
    const [rankings, setRankings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!testId) return
        fetch(`/api/analytics/test/${testId}/leaderboard`)
            .then(res => res.json())
            .then(data => {
                setRankings(data)
                setLoading(false)
            })
            .catch(err => console.error(err))
    }, [testId])

    if (loading) return <div>Loading Leaderboard...</div>

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>Top performers for this test</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Rank</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead className="text-right">Completed</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="font-bold">#{r.rank}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{r.user.name || "Unknown"}</div>
                                    <div className="text-xs text-muted-foreground">{r.user.email}</div>
                                </TableCell>
                                <TableCell>{r.score} / {r.total}</TableCell>
                                <TableCell className="text-right">{new Date(r.completedAt).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                        {rankings.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No results yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
