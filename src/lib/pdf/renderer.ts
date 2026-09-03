// In-process Playwright PDF renderer.
//
// Lives inside the long-running Next.js dev server process so it is NOT subject
// to the sandbox's background-process reaping. A single shared Chromium browser
// is launched lazily and reused across requests; each request gets its own
// page/context which is closed after rendering.

import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      if (browser.isConnected()) return browser;
    } catch {
      // fall through to relaunch
    }
  }
  browserPromise = chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return browserPromise;
}

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

/**
 * Render an HTML document string to a PDF Buffer using a shared Chromium.
 * The HTML's own @page rules and print CSS are respected (preferCSSPageSize).
 */
export async function renderHtmlToPdf(
  html: string,
  options: RenderOptions = {},
): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // networkidle so external fonts/images (Google Fonts, header image) settle.
    await page.setContent(html, { waitUntil: "networkidle", timeout: 45000 });

    // Wait for any images to finish loading (best-effort).
    try {
      await page.evaluate(() => {
        const imgs = Array.from(document.images);
        return Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.onload = res;
                  img.onerror = res;
                }),
          ),
        );
      });
    } catch {
      /* ignore */
    }

    const margin = options.margin ?? {
      top: "15mm",
      bottom: "15mm",
      left: "16mm",
      right: "16mm",
    };

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
