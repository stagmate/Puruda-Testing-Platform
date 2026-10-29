"use client"

import { Star, Quote } from "lucide-react"

export function Testimonials() {
    const reviews = [
        {
            quote: "Puruda completely transformed our JEE Mains & Advanced test series. The instant ranking with tie-breaking based on time spent created healthy competitive urgency among our students. Our batch results jumped 35% this year.",
            author: "Dr. K. S. Ramanathan",
            title: "Director of Academics",
            institute: "Apex IIT-JEE Coaching Academy, Kota",
            rating: 5,
            tag: "Coaching Center"
        },
        {
            quote: "The ability to organize question banks strictly by CBSE Chapters and Subtopics with 3 difficulty levels freed our teachers from hours of manual exam paper typing. The automated parent diagnostic cards are incredible.",
            author: "Mrs. Meenakshi Sundaram",
            title: "Principal & Head of Examinations",
            institute: "Delhi Public Global High School",
            rating: 5,
            tag: "K-12 School"
        },
        {
            quote: "We conducted university midterm assessments for 1,200 engineering students concurrently. The fullscreen lockdown and tab-switch alerts prevented cheating entirely, and grades were synced into our SIS within minutes.",
            author: "Prof. Arvind Trivedi",
            title: "Dean of Academic Assessments",
            institute: "St. Xavier Institute of Technology",
            rating: 5,
            tag: "Degree College"
        }
    ]

    return (
        <section className="py-24 px-4 sm:px-6 bg-slate-50 border-t border-slate-100">
            <div className="max-w-6xl mx-auto space-y-16">
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        Proven Institutional Impact
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Trusted by Leading Educators & Academic Directors
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                        Here is how top coaching centers, schools, and colleges run flawless testing programs with Puruda.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {reviews.map((r, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 relative"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1 text-amber-400">
                                        {[...Array(r.rating)].map((_, idx) => (
                                            <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                        {r.tag}
                                    </span>
                                </div>
                                <p className="text-slate-700 text-sm leading-relaxed italic">
                                    "{r.quote}"
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <div className="font-bold text-slate-900 text-sm">{r.author}</div>
                                <div className="text-xs text-indigo-600 font-medium">{r.title}</div>
                                <div className="text-xs text-slate-500">{r.institute}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
