"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Megaphone } from "lucide-react"

export function NewsWidget() {
    const [news, setNews] = useState<any[]>([])

    useEffect(() => {
        fetch("/api/announcements")
            .then(async res => {
                if (!res.ok) throw new Error("Failed to fetch news")
                return res.json()
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setNews(data)
                } else {
                    console.error("News API returned non-array:", data)
                    setNews([])
                }
            })
            .catch(err => {
                console.error(err)
                setNews([])
            })
    }, [])

    return (
        <Card className="h-full border-l-4 border-l-orange-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-600" />
                    Latest News
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                    {news.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No active announcements.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {news.map((item) => (
                                <div key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {item.content}
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-slate-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs font-medium text-orange-600">
                                            {item.author.name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
