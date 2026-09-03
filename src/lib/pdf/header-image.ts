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
// Falls back gracefully to a provided fallback or undefined.

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
 * Resolve the header image to an embeddable data URL.
 * Tries the source, then Google Drive variants, then the fallback.
 * Returns null if nothing could be fetched.
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
      const base64 = fetched.buffer.toString("base64");
      return `data:${fetched.contentType};base64,${base64}`;
    }
  }
  return null;
}
