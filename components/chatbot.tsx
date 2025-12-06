"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Message = { role: "user" | "model", text: string }

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", text: "Hi! I'm the Puruda AI Assistant. Ask me anything about creating tests or managing students!" }
    ])
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [messages, isOpen])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = { role: "user" as const, text: input }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsLoading(true)

        // Convert to Gemini history format
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                body: JSON.stringify({ message: input, history })
            })
            const data = await res.json()
            setMessages(prev => [...prev, { role: "model", text: data.response }])
        } catch (e) {
            setMessages(prev => [...prev, { role: "model", text: "Sorry, I encountered an error." }])
        }
        setIsLoading(false)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-80 sm:w-96 shadow-2xl"
                    >
                        <Card className="border-primary/20 bg-background/95 backdrop-blur">
                            <CardHeader className="p-4 border-b flex flex-row justify-between items-center bg-primary text-primary-foreground rounded-t-lg">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" /> Puruda AI Support
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 h-80 overflow-y-auto space-y-4" ref={scrollRef}>
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] rounded-lg p-3 text-sm ${m.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-muted rounded-bl-none"
                                            }`}>
                                            {m.text}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && <div className="text-xs text-muted-foreground animate-pulse">Thinking...</div>}
                            </CardContent>
                            <CardFooter className="p-3 border-t">
                                <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex w-full gap-2">
                                    <Input
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder="Type a question..."
                                        className="text-sm"
                                    />
                                    <Button type="submit" size="icon" disabled={isLoading}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                    <MessageCircle className="w-8 h-8" />
                </motion.button>
            )}
        </div>
    )
}
