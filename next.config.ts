import type { NextConfig } from "next";

// Security headers for every response.
const securityHeaders = [
  // Don't allow the site inside someone else's frame (stops clickjacking the login form)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Always use HTTPS for this site (and its subdomains) for the next two years
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Don't guess file types (e.g. treat an uploaded image as a script)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs to other sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs none of these browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

// Signed-in pages are never stored by the browser or shared caches, so the back
// button after logging out can't show a previous user's screen.
const noStore = [{ key: "Cache-Control", value: "no-store, max-age=0" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: noStore },
      { source: "/teacher/:path*", headers: noStore },
      { source: "/student/:path*", headers: noStore },
      { source: "/print/:path*", headers: noStore },
      { source: "/login", headers: noStore },
      // Question images (/api/assets/...) set their own long-lived cache header
      { source: "/api/:path((?!assets/).*)", headers: noStore },
    ];
  },
};

export default nextConfig;
