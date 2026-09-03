// PDF renderer that works in BOTH local dev and Vercel serverless.
//
// - Local dev / Docker / long-running Node: uses Playwright's bundled Chromium
//   (kept warm in-process for speed).
// - Vercel serverless (process.env.VERCEL set): uses puppeteer-core +
//   @sparticuz/chromium with the Chromium binary downloaded from the official
//   Sparticuz GitHub release CDN. This avoids all bundler/file-tracing issues
//   — the ~50MB brotli binary is fetched on first cold start and cached in
//   /tmp/chromium for subsequent invocations in the same function instance.

import path from "node:path";
import fs from "node:fs";
import type { Browser as PuppeteerBrowser } from "puppeteer-core";

const isVercel = !!process.env.VERCEL;

export interface RenderOptions {
  format?: "A4" | "Letter";
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

// ---- Playwright path (local dev) -----------------------------------------
let playwrightBrowserPromise: Promise<unknown> | null = null;

async function getPlaywrightBrowser() {
  const { chromium } = await import("playwright");
  if (playwrightBrowserPromise) {
    try {
      const browser = (await playwrightBrowserPromise) as {
        isConnected: () => boolean;
      };
      if (browser.isConnected()) return browser;
    } catch {
      // fall through to relaunch
    }
  }
  playwrightBrowserPromise = chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return playwrightBrowserPromise;
}

// ---- Puppeteer path (Vercel serverless) ----------------------------------

/**
 * The Chromium binary version to download from the Sparticuz CDN.
 *
 * This MUST match the major version of the installed `@sparticuz/chromium`
 * package (the JS wrapper). The wrapper's `executablePath()` method handles
 * downloading + extracting the brotli-compressed binary when given a URL.
 *
 * Update this when bumping `@sparticuz/chromium` in package.json.
 */
const SPARTICUZ_CHROMIUM_VERSION = "149";

/**
 * On Vercel, always download the Chromium binary from the official Sparticuz
 * GitHub release. This is the most reliable approach — it avoids all issues
 * with Vercel's bundler stripping the large .br binary files from node_modules.
 *
 * The binary is cached in /tmp/chromium after the first download, so
 * subsequent invocations in the same function instance are fast.
 */
async function getPuppeteerBrowser(): Promise<PuppeteerBrowser> {
  const puppeteer = await import("puppeteer-core");
  // @sparticuz/chromium uses a default export (the Chromium class).
  const chromiumModule = await import("@sparticuz/chromium");
  const chromium = (chromiumModule.default ?? chromiumModule) as {
    executablePath: (input?: string) => Promise<string>;
    args: string[];
  };

  // If the binary is already extracted in /tmp/chromium (warm instance),
  // executablePath() returns it immediately without downloading.
  // Otherwise, pass the CDN URL so it downloads + extracts.
  const cdnUrl = `https://github.com/Sparticuz/chromium/releases/download/v${SPARTICUZ_CHROMIUM_VERSION}/chromium-v${SPARTICUZ_CHROMIUM_VERSION}-pack.tar`;

  // Try local bin first (in case Vercel did include it), then fall back to CDN.
  let executablePath: string;
  const localBin = resolveLocalBinPath();
  if (localBin) {
    try {
      executablePath = await chromium.executablePath(localBin);
    } catch {
      console.error("[pdf] local bin failed, downloading from CDN:", cdnUrl);
      executablePath = await chromium.executablePath(cdnUrl);
    }
  } else {
    console.error("[pdf] no local bin, downloading from CDN:", cdnUrl);
    executablePath = await chromium.executablePath(cdnUrl);
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
  return browser;
}

/**
 * Try to find @sparticuz/chromium's bin directory locally. Returns the path
 * if found, empty string otherwise. Uses fs.existsSync (no require.resolve)
 * to avoid Turbopack build-time resolution warnings.
 */
function resolveLocalBinPath(): string {
  const candidates = [
    // Standard node_modules location (relative to cwd)
    path.join(process.cwd(), "node_modules/@sparticuz/chromium/bin"),
    // Vercel serverless function layout
    "/var/task/node_modules/@sparticuz/chromium/bin",
    "/var/task/nodejs/node_modules/@sparticuz/chromium/bin",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "";
}

/**
 * Render an HTML document string to a PDF Buffer.
 * - On Vercel: uses puppeteer-core + @sparticuz/chromium (serverless-safe).
 * - Elsewhere: uses Playwright's bundled Chromium (kept warm in-process).
 */
export async function renderHtmlToPdf(
  html: string,
  options: RenderOptions = {},
): Promise<Buffer> {
  const margin = options.margin ?? {
    top: "8mm",
    bottom: "15mm",
    left: "16mm",
    right: "16mm",
  };

  if (isVercel) {
    return renderWithPuppeteer(html, options, margin);
  }
  return renderWithPlaywright(html, options, margin);
}

async function renderWithPuppeteer(
  html: string,
  options: RenderOptions,
  margin: NonNullable<RenderOptions["margin"]>,
): Promise<Buffer> {
  const browser = await getPuppeteerBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 });

    // Best-effort: wait for images to finish loading.
    await page
      .evaluate(() => {
        const imgs = Array.from(document.images);
        return Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.onload = () => res();
                  img.onerror = () => res();
                }),
          ),
        );
      })
      .catch(() => {});

    const pdf = await page.pdf({
      format: options.format ?? "A4",
      printBackground: options.printBackground ?? true,
      margin,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function renderWithPlaywright(
  html: string,
  options: RenderOptions,
  margin: NonNullable<RenderOptions["margin"]>,
): Promise<Buffer> {
  const browser = (await getPlaywrightBrowser()) as {
    newContext: () => Promise<{
      newPage: () => Promise<{
        setContent: (
          html: string,
          opts?: { waitUntil?: string; timeout?: number },
        ) => Promise<void>;
        evaluate: (fn: () => unknown) => Promise<unknown>;
        pdf: (opts: Record<string, unknown>) => Promise<Buffer>;
        close: () => Promise<void>;
      }>;
      close: () => Promise<void>;
    }>;
  };
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle", timeout: 45000 });

    try {
      await page.evaluate(() => {
        const imgs = Array.from(document.images);
        return Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.onload = () => res();
                  img.onerror = () => res();
                }),
          ),
        );
      });
    } catch {
      /* ignore */
    }

    const pdf = await page.pdf({
      format: options.format ?? "A4",
      printBackground: options.printBackground ?? true,
      margin,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
