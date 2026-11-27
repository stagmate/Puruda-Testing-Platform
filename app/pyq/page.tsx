import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpenCheck, Clock3, Lightbulb, Smartphone, Target, Timer, BarChart3, Layers, CheckCircle2 } from "lucide-react"
import { db } from "@/lib/db"
import { PUBLISHED_PYQ } from "@/lib/practice-server"

export const metadata: Metadata = {
    title: "Free JEE PYQ mock tests · Puruda Classes",
    description: "Practise JEE previous-year questions as full-paper and chapter-wise mock tests, with solutions. Sign up free with your phone.",
}
// Counts come from the live question bank.
export const dynamic = "force-dynamic"

async function loadStats() {
    try {
        const [papers, bySubject, subjects] = await Promise.all([
            db.pyqPaper.findMany({ where: { isPublished: true }, select: { id: true, title: true, year: true, exam: true, session: true, _count: { select: { questions: true } } }, orderBy: [{ year: "desc" }, { session: "asc" }] }),
            db.question.groupBy({ by: ["subjectId"], where: PUBLISHED_PYQ, _count: true }),
            db.subject.findMany({ select: { id: true, name: true } }),
        ])
        const chapters = await db.question.groupBy({ by: ["chapterId"], where: { ...PUBLISHED_PYQ, chapterId: { not: null } } })
        const name = new Map(subjects.map(s => [s.id, s.name]))
        return {
            papers,
            total: bySubject.reduce((n, r) => n + r._count, 0),
            chapters: chapters.length,
            subjects: bySubject.map(r => ({ name: (r.subjectId && name.get(r.subjectId)) || "Other", count: r._count })).sort((a, b) => b.count - a.count),
            years: papers.length ? [Math.min(...papers.map(p => p.year)), Math.max(...papers.map(p => p.year))] : null,
        }
    } catch {
        return { papers: [], total: 0, chapters: 0, subjects: [], years: null }
    }
}

const fmt = new Intl.NumberFormat("en-IN")

export default async function PyqLandingPage() {
    const stats = await loadStats()
    const byYear = new Map<number, typeof stats.papers>()
    for (const p of stats.papers) byYear.set(p.year, [...(byYear.get(p.year) ?? []), p])

    return (
        <main className="bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white">
                <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" aria-hidden />
                <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
                    <div className="space-y-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />Free for every JEE aspirant
                        </span>
                        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                            JEE previous-year questions,<br /><span className="text-orange-400">as real mock tests.</span>
                        </h1>
                        <p className="max-w-xl text-lg text-indigo-100">
                            Attempt full past papers or chapter-wise PYQ sets. Practise at your own pace or under the exam timer. Check solutions and your accuracy after every attempt.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/pyq/signup" className="inline-flex h-12 items-center gap-2 rounded-xl bg-orange-500 px-6 text-base font-bold text-white shadow-lg shadow-orange-900/30 hover:bg-orange-600">
                                Start free with your phone <ArrowRight className="h-5 w-5" />
                            </Link>
                            <Link href="/pyq/login" className="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 text-base font-semibold hover:bg-white/10">
                                Log in
                            </Link>
                        </div>
                        <p className="flex items-center gap-2 text-sm text-indigo-200"><Smartphone className="h-4 w-4" />Sign up with your name and mobile number. Verified by OTP; no password.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 self-center">
                        <Stat value={stats.total ? fmt.format(stats.total) : "Coming soon"} label="Previous-year questions" />
                        <Stat value={stats.papers.length ? String(stats.papers.length) : "—"} label="Full papers" />
                        <Stat value={stats.chapters ? String(stats.chapters) : "—"} label="Chapters covered" />
                        <Stat value={stats.years ? (stats.years[0] === stats.years[1] ? String(stats.years[0]) : `${stats.years[0]}–${stats.years[1]}`) : "—"} label="Years" />
                        {stats.subjects.length > 0 && (
                            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-200">By subject</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {stats.subjects.slice(0, 3).map(s => (
                                        <div key={s.name}><p className="text-xl font-bold">{fmt.format(s.count)}</p><p className="text-xs text-indigo-200">{s.name}</p></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Two modes */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <h2 className="text-center text-3xl font-bold text-slate-900">Two ways to practise</h2>
                <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">Pick a full paper or any chapters, then choose how you want to attempt it.</p>
                <div className="mt-10 grid gap-5 md:grid-cols-2">
                    <ModeCard icon={BookOpenCheck} tone="emerald" title="Practice mode" points={["No timer: solve at your own pace, like a book", "Check each answer as soon as you mark it", "See the correct option and full solution right away"]} />
                    <ModeCard icon={Timer} tone="indigo" title="Test mode" points={["Exam timer and JEE Main marking (+4 / −1)", "Question palette, mark and move like the real CBT", "Score, accuracy, time per question and solutions at the end"]} />
                </div>
            </section>

            {/* How it works */}
            <section className="bg-slate-50 py-16">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <h2 className="text-center text-3xl font-bold text-slate-900">How it works</h2>
                    <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { icon: Smartphone, title: "Sign up free", text: "Name and mobile number, verified with an OTP." },
                            { icon: Layers, title: "Choose what to solve", text: "A full year-wise paper, or a chapter-wise PYQ set." },
                            { icon: Clock3, title: "Practice or test", text: "Untimed with instant answers, or timed like the exam." },
                            { icon: BarChart3, title: "Review & improve", text: "Solutions, accuracy and time spent on every question." },
                        ].map((s, i) => (
                            <li key={s.title} className="rounded-2xl border bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{i + 1}</span>
                                    <s.icon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <p className="font-semibold text-slate-900">{s.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Papers */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Papers available</h2>
                        <p className="mt-1 text-slate-600">Each paper can be attempted in practice or test mode.</p>
                    </div>
                    <Link href="/pyq/signup" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">Attempt them free <ArrowRight className="h-4 w-4" /></Link>
                </div>
                {byYear.size === 0 ? (
                    <p className="mt-8 rounded-2xl border border-dashed p-8 text-center text-slate-500">Papers are being added. Sign up now and you&apos;ll find them in your dashboard as soon as they&apos;re live.</p>
                ) : (
                    <div className="mt-8 space-y-6">
                        {[...byYear.entries()].map(([year, papers]) => (
                            <div key={year}>
                                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{year}</h3>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {papers.map(p => (
                                        <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-slate-900">{p.exam}{p.session ? ` · ${p.session}` : ""}</p>
                                                <p className="text-xs text-slate-500">{p._count.questions} questions</p>
                                            </div>
                                            <Target className="h-5 w-5 shrink-0 text-orange-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* CTA */}
            <section className="mx-auto mb-16 max-w-6xl px-4 sm:px-6">
                <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-10 text-center text-white sm:px-12">
                    <Lightbulb className="h-10 w-10" />
                    <h2 className="text-3xl font-bold">Every PYQ you solve is a pattern you won&apos;t miss.</h2>
                    <p className="max-w-xl text-orange-50">Create your free account in under a minute.</p>
                    <Link href="/pyq/signup" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-orange-600 hover:bg-orange-50">
                        Sign up free <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>
        </main>
    )
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-extrabold sm:text-3xl">{value}</p>
            <p className="text-xs text-indigo-200">{label}</p>
        </div>
    )
}

function ModeCard({ icon: Icon, title, points, tone }: { icon: typeof Timer; title: string; points: string[]; tone: "emerald" | "indigo" }) {
    const c = tone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"
    return (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${c}`}><Icon className="h-4 w-4" />{title}</span>
            <ul className="mt-4 space-y-2">
                {points.map(p => <li key={p} className="flex items-start gap-2 text-slate-700"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />{p}</li>)}
            </ul>
        </div>
    )
}
