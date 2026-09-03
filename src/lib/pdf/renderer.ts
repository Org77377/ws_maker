// PDF renderer that works in BOTH local dev and Vercel serverless.
//
// - Local dev / Docker / long-running Node: uses Playwright's bundled Chromium
//   (kept warm in-process for speed).
// - Vercel serverless (process.env.VERCEL set): uses puppeteer-core +
//   @sparticuz/chromium, a Chromium build specifically packaged for AWS
//   Lambda / Vercel function environments (no system deps, fits in the 250MB
//   limit). Each invocation launches a fresh browser — this is the standard
//   serverless pattern.

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
async function getPuppeteerBrowser(): Promise<PuppeteerBrowser> {
  const puppeteer = await import("puppeteer-core");
  const chromium = await import("@sparticuz/chromium");
  // The `chromium.executablePath()` returns the path to the extracted binary
  // inside the Lambda/Vercel function environment.
  const executablePath = await chromium.executablePath();
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
