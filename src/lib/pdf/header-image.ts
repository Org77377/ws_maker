// Server-side header image resolver.
//
// Google Drive share/view links are unreliable for direct <img> embedding in
// headless Chromium (auth redirects, rate limiting). To guarantee the header
// always renders in the PDF, we fetch the image bytes server-side and embed
// them as a base64 data URL.
//
// Supports:
//   - https://drive.google.com/file/d/<ID>/view?usp=...
//   - https://drive.google.com/open?id=<ID>
//   - https://drive.google.com/uc?export=view&id=<ID>
//   - https://drive.google.com/thumbnail?id=<ID>&sz=...
//   - https://lh3.googleusercontent.com/...
//   - Any direct image URL
//
// After fetching, a built-in bottom black rule (common in school banner
// graphics) is detected and trimmed so the worksheet has NO line directly
// below the header image — matching the clean sample format.
//
// Falls back gracefully to a provided fallback or undefined.

import sharp from "sharp";
import { FALLBACK_HEADER_IMAGE } from "../worksheet/types";

const DRIVE_FILE_RE = /drive\.google\.com\/file\/d\/([^/]+)/;
const DRIVE_OPEN_RE = /drive\.google\.com\/open\?id=([^&]+)/;
const DRIVE_UC_RE = /drive\.google\.com\/uc\?[^"]*id=([^&]+)/;
const DRIVE_THUMB_RE = /drive\.google\.com\/thumbnail\?[^"]*id=([^&]+)/;

export function resolveGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const m =
    url.match(DRIVE_FILE_RE) ||
    url.match(DRIVE_OPEN_RE) ||
    url.match(DRIVE_UC_RE) ||
    url.match(DRIVE_THUMB_RE);
  return m ? m[1] : null;
}

/** Build candidate direct-image URLs for a given source. */
export function buildCandidateUrls(source: string): string[] {
  const candidates: string[] = [];
  const driveId = resolveGoogleDriveId(source);
  if (driveId) {
    // Try multiple Google Drive direct endpoints in order of reliability.
    candidates.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
    candidates.push(
      `https://lh3.googleusercontent.com/d/${driveId}=w1200-h300-p-k-nu`,
    );
    candidates.push(`https://drive.google.com/uc?export=download&id=${driveId}`);
  }
  if (source && !source.includes("drive.google.com")) {
    candidates.push(source);
  }
  return candidates;
}

async function fetchAsBuffer(
  url: string,
  timeoutMs = 12000,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some hosts gate on user-agent.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const arrayBuf = await res.arrayBuffer();
    if (!arrayBuf || arrayBuf.byteLength < 100) return null;
    return { buffer: Buffer.from(arrayBuf), contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Detect and remove a built-in horizontal black rule at the bottom of a banner
 * image (and any trailing whitespace below it). Returns a cleaned PNG buffer.
 *
 * Many school header banners ship with a thin black separator line baked into
 * the graphic near the bottom edge. The worksheet format requires NO line
 * directly below the header image, so we trim it server-side.
 *
 * Algorithm: scan rows from the bottom up and find the LOWEST row that is a
 * "line row" (>=40% of its center pixels are dark, luminance < 80). A
 * full-width horizontal rule produces ~80%+ dark pixels, so 40% reliably
 * distinguishes it from text/logos. Once found, walk upward over contiguous
 * line rows to find the top of the rule, then crop everything from there down.
 * If no line is found, the image is returned unchanged.
 */
async function trimBottomLine(buffer: Buffer): Promise<Buffer> {
  try {
    const img = sharp(buffer).flatten({ background: "#ffffff" });
    const meta = await img.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width < 10 || height < 10) return buffer;

    const channels = meta.channels || 3;
    const raw = await img.raw().toBuffer();
    const bytesPerRow = width * channels;
    const xStart = Math.floor(width * 0.2);
    const xEnd = Math.floor(width * 0.8);
    const sampleWidth = xEnd - xStart;

    // Returns true if row `y` is a horizontal line (>=40% dark center pixels).
    const isLineRow = (y: number): boolean => {
      let dark = 0;
      for (let x = xStart; x < xEnd; x++) {
        const idx = y * bytesPerRow + x * channels;
        const lum = (raw[idx] + raw[idx + 1] + raw[idx + 2]) / 3;
        if (lum < 80) dark++;
      }
      return dark / sampleWidth >= 0.4;
    };

    // Scan from the bottom up to find the lowest line row.
    let lowestLine = -1;
    for (let y = height - 1; y >= 0; y--) {
      if (isLineRow(y)) {
        lowestLine = y;
        break;
      }
    }

    if (lowestLine === -1) return buffer; // no line found — keep original

    // Walk upward over contiguous line rows to find the top of the rule.
    let lineTop = lowestLine;
    while (lineTop > 0 && isLineRow(lineTop - 1)) lineTop--;

    // Also trim anti-aliased rows directly above the rule (gray pixels that
    // are not pure-black but still visibly non-white). Walk up while the row
    // has >5% of pixels with luminance < 230.
    while (lineTop > 0) {
      let nonWhite = 0;
      for (let x = xStart; x < xEnd; x++) {
        const idx = (lineTop - 1) * bytesPerRow + x * channels;
        const lum = (raw[idx] + raw[idx + 1] + raw[idx + 2]) / 3;
        if (lum < 230) nonWhite++;
      }
      if (nonWhite / sampleWidth > 0.05) lineTop--;
      else break;
    }

    // Crop to keep rows [0, lineTop - 1].
    const newHeight = Math.max(1, lineTop);
    const cleaned = await sharp(buffer)
      .flatten({ background: "#ffffff" })
      .extract({ left: 0, top: 0, width, height: newHeight })
      .png()
      .toBuffer();
    return cleaned;
  } catch {
    return buffer; // on any error, use the original image unchanged
  }
}

/**
 * Resolve the header image to an embeddable data URL.
 * Tries the source, then Google Drive variants, then the fallback.
 * The fetched image is cleaned (bottom black rule trimmed) and returned as a
 * PNG data URL. Returns null if nothing could be fetched.
 */
export async function resolveHeaderImageDataUrl(
  source: string | undefined,
): Promise<string | null> {
  const sources: string[] = [];
  if (source && source.trim()) {
    sources.push(...buildCandidateUrls(source.trim()));
  }
  sources.push(FALLBACK_HEADER_IMAGE);

  for (const url of sources) {
    const fetched = await fetchAsBuffer(url);
    if (fetched) {
      const cleaned = await trimBottomLine(fetched.buffer);
      const base64 = cleaned.toString("base64");
      return `data:image/png;base64,${base64}`;
    }
  }
  return null;
}
