"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

export function FaqSection() {
    const [openIdx, setOpenIdx] = useState<number | null>(0)

    const faqs = [
        {
            q: "How does the institutional license subscription work?",
            a: "Our licensing model is tailored for institutions (coaching centers, schools, colleges) with transparent fixed tiers or custom campus-wide quotas. Unlike legacy software that charges per test taken, Puruda allows unlimited tests and attempts within your enrolled student quota. Annual plans receive a 20% institutional discount."
        },
        {
            q: "Can we import our existing questions from CSV or PDF files?",
            a: "Yes! Puruda includes a high-speed bulk ingestion engine. You can upload questions in bulk using standard CSV spreadsheets or PDF question papers. The system automatically extracts question statements, choices (A, B, C, D), answer keys, LaTeX math notation, and diagram attachments."
        },
        {
            q: "How does the Anti-Cheat Proctoring prevent student cheating?",
            a: "Puruda operates an in-browser secure sandbox. When a student starts an exam, fullscreen mode is strictly enforced. The platform immediately logs window defocus, tab switching, and copy-paste attempts. Administrators can configure maximum allowable warnings before a test is automatically locked or submitted."
        },
        {
            q: "Can we schedule tests for specific batches with strict start/end times?",
            a: "Yes. Tests can be assigned to individual batches (e.g., 'Morning JEE Super-30' or 'Section 12-A'). You can configure an exact Start Time, End Time, and Test Duration window. You can also toggle whether students see instant results or whether scores remain hidden until the review window ends."
        },
        {
            q: "Do you support offline physical exams if our campus lacks enough computers?",
            a: "Absolutely. Puruda features a dedicated Printable Test Mode. With one click, teachers can generate a clean, publication-ready PDF question paper formatted for print, accompanied by a separate instructor answer key and OMR evaluation sheet."
        },
        {
            q: "Can teachers and faculty members have delegated access without full admin rights?",
            a: "Yes. Puruda includes a multi-tiered role architecture: Admins manage institute courses, subjects, and licenses; Teachers are assigned specific batches and subjects to upload questions, create homework tests, and conduct performance reviews; Students only see their enrolled tests and personal progress cards."
        }
    ]

    return (
        <section id="faq" className="py-24 px-4 sm:px-6 bg-white relative">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        Frequently Asked Questions
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Everything You Need to Know About Licensing & Setup
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                        Have a question about deploying Puruda at your campus? Here are the most common answers.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => {
                        const isOpen = openIdx === i
                        return (
                            <div
                                key={i}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isOpen
                                        ? "bg-slate-50/80 border-indigo-200 shadow-sm"
                                        : "bg-white border-slate-200/90 hover:border-slate-300"
                                }`}
                            >
                                <button
                                    onClick={() => setOpenIdx(isOpen ? null : i)}
                                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-base sm:text-lg cursor-pointer"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown
                                        className={`h-5 w-5 text-indigo-600 shrink-0 transition-transform duration-200 ${
                                            isOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-200/40 pt-4 animate-in fade-in duration-200">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
