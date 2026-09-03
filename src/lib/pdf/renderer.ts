// PDF renderer that works in BOTH local dev and Vercel serverless.
//
// - Local dev / Docker / long-running Node: uses Playwright's bundled Chromium
//   (kept warm in-process for speed).
// - Vercel serverless (process.env.VERCEL set): uses puppeteer-core +
//   @sparticuz/chromium, a Chromium build specifically packaged for AWS
//   Lambda / Vercel function environments (no system deps, fits in the 250MB
//   limit). Each invocation launches a fresh browser — this is the standard
//   serverless pattern.

import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import type { Browser as PuppeteerBrowser } from "puppeteer-core";

const require = createRequire(import.meta.url);
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
 * Resolve the @sparticuz/chromium `bin` directory reliably across bundlers
 * and Vercel's serverless runtime.
 *
 * The package ships the Chromium binary as brotli-compressed files inside its
 * `bin/` folder. Its default `executablePath()` uses `import.meta.url` to find
 * `bin/`, but Vercel's function bundler relocates files and that resolution
 * fails at runtime with:
 *   "The input directory .../bin does not exist"
 *
 * We resolve the path explicitly via Node's module resolution (which follows
 * the actual installed location) and fall back to a couple of common Vercel
 * layouts. Returns the path to pass to `chromium.executablePath(input)`.
 */
function resolveSparticuzBinPath(): string {
  // Strategy 1: resolve via the package.json location.
  try {
    const pkgJsonPath = require.resolve("@sparticuz/chromium/package.json");
    const binDir = path.join(path.dirname(pkgJsonPath), "bin");
    if (fs.existsSync(binDir)) return binDir;
  } catch {
    /* ignore */
  }

  // Strategy 2: common Vercel serverless layout (/var/task/node_modules/...).
  const candidates = [
    "/var/task/node_modules/@sparticuz/chromium/bin",
    "/var/task/nodejs/node_modules/@sparticuz/chromium/bin",
    path.join(process.cwd(), "node_modules/@sparticuz/chromium/bin"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Strategy 3: let @sparticuz/chromium use its default resolution (will throw
  // a helpful error if nothing is found).
  return "";
}

async function getPuppeteerBrowser(): Promise<PuppeteerBrowser> {
  const puppeteer = await import("puppeteer-core");
  // @sparticuz/chromium uses a default export (the Chromium class). The
  // `executablePath` static method is async and returns the path to the
  // extracted Chromium binary inside the Lambda/Vercel function environment.
  const chromiumModule = await import("@sparticuz/chromium");
  const chromium = (chromiumModule.default ?? chromiumModule) as {
    executablePath: (input?: string) => Promise<string>;
    args: string[];
  };

  // Pass the explicit bin path so Vercel's relocated bundle layout doesn't
  // break the default import.meta.url-based resolution. If the bin dir is
  // missing entirely (Vercel sometimes strips the 64MB chromium.br), fall
  // back to downloading the binary from the official Sparticuz CDN release.
  const binPath = resolveSparticuzBinPath();
  let executablePath: string;
  try {
    executablePath = await chromium.executablePath(binPath || undefined);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist")) {
      // Fallback: download the matching chromium.br from the Sparticuz
      // releases CDN. The version must match the installed @sparticuz/chromium
      // version; we read it from the package.json at runtime.
      let version = "121";
      try {
        const pkgJsonPath = require.resolve("@sparticuz/chromium/package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
        version = pkg.version;
      } catch {
        /* use default */
      }
      const downloadUrl = `https://github.com/Sparticuz/chromium/releases/download/v${version}/chromium-v${version}-pack.tar`;
      console.error(
        "[pdf] bin dir missing, downloading from CDN:",
        downloadUrl,
      );
      executablePath = await chromium.executablePath(downloadUrl);
    } else {
      throw err;
    }
  }

  // `chromium.args` includes the flags needed for serverless (single-process,
  // no sandbox, etc.). We also force a headless shell.
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
  return browser;
}

/**
 * Render an HTML document string to a PDF Buffer.
 * - On Vercel: uses puppeteer-core + @sparticuz/chromium (serverless-safe).
 * - Elsewhere: uses Playwright's bundled Chromium (kept warm in-process).
 *
 * The HTML's own @page rules and print CSS are respected (preferCSSPageSize
 * for Playwright / printBackground + margin for Puppeteer).
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
