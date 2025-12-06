"use client";

import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface PrintableTestProps {
    test: any;
    mode: "student" | "teacher" | "key";
}

export function PrintableTest({ test, mode }: PrintableTestProps) {
    useEffect(() => {
        // Auto-trigger print when loaded in a dedicated window/iframe
        setTimeout(() => {
            window.print();
        }, 500);
    }, []);

    if (!test) return <div>Loading Test...</div>;

    return (
        <div className="p-8 max-w-[210mm] mx-auto bg-white print:p-0">
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6 text-center">
                <h1 className="text-2xl font-bold uppercase tracking-wider">{test.title}</h1>
                <div className="flex justify-between mt-2 text-sm">
                    <span>
                        <strong>Subject:</strong> {test.subject?.name || "General"}
                    </span>
                    <span>
                        <strong>Duration:</strong> {test.duration} mins
                    </span>
                    <span>
                        <strong>Total Questions:</strong> {test.questions.length}
                    </span>
                </div>
            </div>

            {mode === "key" ? (
                /* Answer Key Mode */
                <div>
                    <h2 className="text-xl font-bold mb-4 text-center">Answer Key</h2>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        {test.questions.map((q: any, i: number) => {
                            // Determine correct answer display
                            let correctAns = q.correct;
                            // If it's single/MSQ, maybe show "Option A" etc.
                            // Assuming q.correct holds the value or key.
                            // For display simplicity, let's show what is stored.
                            if (Array.isArray(correctAns)) correctAns = correctAns.join(", ");

                            return (
                                <div key={q.id} className="border p-2">
                                    <span className="font-bold mr-2">Q{i + 1}.</span>
                                    <span>{correctAns}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Question Paper (Student/Teacher) */
                <div className="space-y-6">
                    {mode === "student" && (
                        <div className="flex justify-between border p-4 mb-6 text-sm">
                            <div className="w-1/3 border-b border-dotted border-black h-8 mt-4">Name:</div>
                            <div className="w-1/3 border-b border-dotted border-black h-8 mt-4">Roll No:</div>
                            <div className="w-1/3 border-b border-dotted border-black h-8 mt-4">Score:</div>
                        </div>
                    )}

                    {test.questions.map((q: any, i: number) => {
                        const options =
                            typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];

                        // Check correct answer for Teacher Mode
                        const isCorrect = (opt: string) => {
                            if (mode !== 'teacher') return false;
                            if (q.type === 'MULTIPLE') {
                                const corr = typeof q.correct === 'string' ? JSON.parse(q.correct) : q.correct;
                                return Array.isArray(corr) && corr.includes(opt);
                            }
                            return q.correct === opt; // Exact match for SINGLE
                        }

                        return (
                            <div key={q.id} className="break-inside-avoid">
                                <div className="flex gap-2">
                                    <span className="font-bold">{i + 1}.</span>
                                    <div className="flex-1">
                                        <p className="mb-2 font-medium">{q.text}</p>

                                        {q.imageUrl && (
                                            <div className="my-2 p-2 border border-slate-200 inline-block">
                                                <img src={q.imageUrl} alt="Question Diagram" className="max-h-40 object-contain" />
                                            </div>
                                        )}

                                        {q.type === "INTEGER" ? (
                                            <div className="mt-2 text-sm">
                                                <span className="font-semibold">Answer: </span>
                                                {mode === "teacher" ? (
                                                    <span className="font-bold underline">{q.correct}</span>
                                                ) : (
                                                    <span className="inline-block border-b border-black w-24 h-6 align-bottom"></span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 text-sm">
                                                {options.map((opt: string, idx: number) => {
                                                    const correct = isCorrect(opt);
                                                    return (
                                                        <div key={idx} className={`flex items-start gap-2 ${correct ? 'font-bold text-black' : ''}`}>
                                                            <span className={`w-5 h-5 flex items-center justify-center border rounded-full text-xs ${correct ? 'border-2 border-black bg-slate-100' : 'border-slate-400'}`}>
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <span>
                                                                {opt}
                                                                {correct && <CheckCircle2 className="inline ml-1 w-3 h-3" />}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 text-center text-[10px] text-gray-400 print:block hidden p-2 border-t mt-4 bg-white">
                Generated by Puruda Testing Platform
            </div>
        </div>
    );
}
