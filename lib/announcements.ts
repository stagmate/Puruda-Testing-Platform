// Announcement scheduling: an announcement shows on the site from its start
// until its end, and is flagged "New" for its first few days.

export const NEW_FOR_DAYS = 3
const DAY = 24 * 60 * 60 * 1000

export type Schedulable = { startsAt: string | Date; endsAt?: string | Date | null }
export type AnnouncementStatus = "scheduled" | "live" | "expired"

const ms = (d: string | Date) => new Date(d).getTime()

export function announcementStatus(a: Schedulable, now = Date.now()): AnnouncementStatus {
    if (ms(a.startsAt) > now) return "scheduled"
    if (a.endsAt && ms(a.endsAt) <= now) return "expired"
    return "live"
}

/** Live and published within the last NEW_FOR_DAYS days. */
export function isNewAnnouncement(a: Schedulable, now = Date.now()) {
    return announcementStatus(a, now) === "live" && now - ms(a.startsAt) < NEW_FOR_DAYS * DAY
}

/** Validates the start/end of an announcement. Returns an error message or null. */
export function scheduleError(startsAt: Date, endsAt: Date | null): string | null {
    if (isNaN(startsAt.getTime())) return "Invalid start date"
    if (!endsAt) return "Choose an end date"
    if (isNaN(endsAt.getTime())) return "Invalid end date"
    if (endsAt <= startsAt) return "The end date must be after the start date"
    return null
}

/** "YYYY-MM-DD" from a date input → the start of that day in the browser's time zone. */
export function dayStart(day: string): Date {
    const [y, m, d] = day.split("-").map(Number)
    return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/** "YYYY-MM-DD" → the last moment of that day in the browser's time zone. */
export function dayEnd(day: string): Date {
    const [y, m, d] = day.split("-").map(Number)
    return new Date(y, m - 1, d, 23, 59, 59, 999)
}

/** A date → "YYYY-MM-DD" in the browser's time zone, for <input type="date">. */
export function toDayInput(d: string | Date | null | undefined): string {
    if (!d) return ""
    const x = new Date(d)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

/** Reads and checks { title, content, startsAt, endsAt } from a request body. */
export function readAnnouncement(body: unknown): { data?: { title: string; content: string; startsAt: Date; endsAt: Date }; error?: string } {
    const b = (body ?? {}) as Record<string, unknown>
    const title = typeof b.title === "string" ? b.title.trim() : ""
    const content = typeof b.content === "string" ? b.content.trim() : ""
    if (!title || !content) return { error: "Title and message are required" }
    if (title.length > 200) return { error: "The title is too long (200 characters at most)" }
    if (content.length > 5000) return { error: "The message is too long (5000 characters at most)" }
    const startsAt = b.startsAt ? new Date(String(b.startsAt)) : new Date()
    const endsAt = b.endsAt ? new Date(String(b.endsAt)) : null
    const error = scheduleError(startsAt, endsAt)
    if (error) return { error }
    return { data: { title, content, startsAt, endsAt: endsAt! } }
}
