// Identify an image by its first bytes rather than trusting the browser's
// declared type. Only plain raster formats are accepted (SVG can carry scripts).
export function sniffImageType(buf: Uint8Array): string | null {
    const starts = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b)
    if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png"
    if (starts(0xff, 0xd8, 0xff)) return "image/jpeg"
    if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif"
    if (starts(0x52, 0x49, 0x46, 0x46) && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp"
    return null
}
