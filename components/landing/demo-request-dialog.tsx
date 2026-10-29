"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Building2, Sparkles, Send } from "lucide-react"

interface DemoRequestDialogProps {
    children?: React.ReactNode
    defaultTier?: string
}

export function DemoRequestDialog({ children, defaultTier }: DemoRequestDialogProps) {
    const [open, setOpen] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        instituteName: "",
        email: "",
        phone: "",
        instituteType: "coaching",
        studentCount: "250-1000",
        tier: defaultTier || "Institute Pro"
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            setSubmitted(true)
        }, 600)
    }

    const handleReset = () => {
        setSubmitted(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200">
                        Request Institute Demo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl">
                {!submitted ? (
                    <>
                        <DialogHeader className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold w-fit border border-indigo-100">
                                <Sparkles className="h-3.5 w-3.5" />
                                Institutional Trial & Licensing
                            </div>
                            <DialogTitle className="text-2xl font-bold text-slate-900">
                                Experience Puruda for Your Campus
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                                Get a custom 14-day evaluation environment with bulk question imports, anti-cheat proctoring, and priority institutional support.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Your Full Name</Label>
                                    <Input
                                        required
                                        placeholder="Dr. Rajesh Sharma"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-10 text-sm border-slate-200 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Institute Name</Label>
                                    <Input
                                        required
                                        placeholder="Apex Coaching / DPS School"
                                        value={formData.instituteName}
                                        onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                                        className="h-10 text-sm border-slate-200 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Official Email</Label>
                                    <Input
                                        required
                                        type="email"
                                        placeholder="director@institute.edu"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-10 text-sm border-slate-200 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Phone / WhatsApp</Label>
                                    <Input
                                        required
                                        placeholder="+91 98765 43210"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="h-10 text-sm border-slate-200 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Institution Type</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={formData.instituteType}
                                        onChange={(e) => setFormData({ ...formData, instituteType: e.target.value })}
                                    >
                                        <option value="coaching">Coaching Institute / Academy</option>
                                        <option value="school">K-12 School</option>
                                        <option value="college">Degree College / University</option>
                                        <option value="corporate">Training Center</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Active Students</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={formData.studentCount}
                                        onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                                    >
                                        <option value="under-250">Under 250 Students</option>
                                        <option value="250-1000">250 - 1,000 Students</option>
                                        <option value="1000-5000">1,000 - 5,000 Students</option>
                                        <option value="5000+">5,000+ Campus-Wide</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        "Preparing Evaluation License..."
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" /> Request Institutional Demo & Trial
                                        </>
                                    )}
                                </Button>
                                <p className="text-[11px] text-center text-slate-400 mt-2">
                                    No credit card required • Personalized onboarding within 4 business hours
                                </p>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Request Confirmed!</h3>
                        <p className="text-slate-600 text-sm max-w-sm mx-auto">
                            Thank you, <span className="font-semibold text-slate-800">{formData.name}</span>. An enterprise onboarding specialist has been assigned to <span className="font-semibold text-slate-800">{formData.instituteName}</span>.
                        </p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-left text-slate-600 space-y-1">
                            <p>📧 Demo credentials sent to: <strong>{formData.email}</strong></p>
                            <p>📞 Phone verification contact: <strong>{formData.phone}</strong></p>
                            <p>⚡ Setup SLA: <strong>Instant access configuration ready</strong></p>
                        </div>
                        <Button
                            onClick={handleReset}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 mt-2"
                        >
                            Return to Homepage
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
