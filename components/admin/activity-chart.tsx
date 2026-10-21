"use client"

import { useState } from "react"

type Day = { date: string; count: number }

const BAR_COLOR = "#6366f1" // indigo-500, validated against the white card surface

function parseDay(date: string) {
    // "2026-10-21" -> local date at noon (avoids timezone edge shifts)
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d, 12)
}

// Smallest "clean" number (1, 2, 5, 10, 20, 25, 50, 100, ...) at or above n.
function niceMax(n: number) {
    if (n <= 0) return 1
    const pow = 10 ** Math.floor(Math.log10(n))
    for (const step of pow >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10]) {
        if (step * pow >= n) return step * pow
    }
    return 10 * pow
}

/** Column chart of test submissions per day. One series, so no legend; the title names it. */
export function ActivityChart({ days }: { days: Day[] }) {
    const [active, setActive] = useState<number | null>(null)
    const peak = Math.max(0, ...days.map(d => d.count))
    const yMax = niceMax(peak)
    const peakIndex = peak > 0 ? days.findIndex(d => d.count === peak) : -1
    const total = days.reduce((n, d) => n + d.count, 0)

    const fmtLong = (date: string) =>
        parseDay(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })

    return (
        <div>
            <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="text-sm text-slate-500">
                    <span className="text-2xl font-semibold text-slate-900 tabular-nums">{total.toLocaleString()}</span>{" "}
                    in the last {days.length} days
                </p>
                <p className="min-h-5 text-right text-xs text-slate-600 tabular-nums" aria-live="polite">
                    {active !== null && `${fmtLong(days[active].date)} · ${days[active].count} submission${days[active].count === 1 ? "" : "s"}`}
                </p>
            </div>

            <div className="flex gap-2">
                {/* Y axis: two clean ticks */}
                <div className="flex h-40 flex-col justify-between text-right text-[10px] leading-none text-slate-400 tabular-nums" aria-hidden>
                    <span>{yMax}</span>
                    <span>0</span>
                </div>

                <div className="relative flex-1">
                    {/* Hairline gridline at the top tick and the baseline */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-slate-100" aria-hidden />
                    <div className="flex h-40 items-end border-b border-slate-200" onMouseLeave={() => setActive(null)}>
                        {days.map((d, i) => {
                            const pct = (d.count / yMax) * 100
                            const isActive = active === i
                            return (
                                <button
                                    key={d.date}
                                    type="button"
                                    className="group relative flex h-full flex-1 items-end justify-center outline-none"
                                    onMouseEnter={() => setActive(i)}
                                    onFocus={() => setActive(i)}
                                    onBlur={() => setActive(null)}
                                    onClick={() => setActive(isActive ? null : i)}
                                    aria-label={`${fmtLong(d.date)}: ${d.count} submissions`}
                                >
                                    {i === peakIndex && (
                                        <span
                                            className="absolute text-[10px] font-medium text-slate-700 tabular-nums"
                                            style={{ bottom: `calc(${pct}% + 4px)` }}
                                            aria-hidden
                                        >
                                            {d.count}
                                        </span>
                                    )}
                                    <span
                                        className="block w-[60%] max-w-6 rounded-t transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-indigo-300"
                                        style={{
                                            height: d.count > 0 ? `max(${pct}%, 3px)` : 0,
                                            backgroundColor: BAR_COLOR,
                                            opacity: active === null || isActive ? 1 : 0.45,
                                        }}
                                    />
                                </button>
                            )
                        })}
                    </div>
                    {/* X axis: day of month, with the month on the first day and the 1st */}
                    <div className="mt-1 flex text-[10px] text-slate-400 tabular-nums" aria-hidden>
                        {days.map((d, i) => {
                            const dt = parseDay(d.date)
                            const showMonth = i === 0 || dt.getDate() === 1
                            return (
                                <span key={d.date} className={`flex-1 whitespace-nowrap ${i === 0 ? "text-left" : "text-center"} ${i % 2 === 1 ? "invisible sm:visible" : ""}`}>
                                    {showMonth ? dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : dt.getDate()}
                                </span>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Same data as a table, for screen readers */}
            <table className="sr-only">
                <caption>Test submissions per day</caption>
                <thead><tr><th>Date</th><th>Submissions</th></tr></thead>
                <tbody>
                    {days.map(d => <tr key={d.date}><td>{fmtLong(d.date)}</td><td>{d.count}</td></tr>)}
                </tbody>
            </table>
        </div>
    )
}
