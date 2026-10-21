// Pages that use the dashboard layout (sidebar + mobile menu). The site-wide
// header and footer step aside on these, since the dashboard has its own chrome.
const DASHBOARD_PREFIXES = ["/admin", "/teacher", "/student"]

export function isDashboardPath(pathname: string | null) {
    return !!pathname && DASHBOARD_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"))
}
