// PDF renderer — works in local dev (Playwright) and Vercel (puppeteer-core +
// @sparticuz/chromium). Key improvements:
//
// - NO conflicting margin option: preferCSSPageSize: true reads from @page CSS
// - Replaces /fonts/ URLs with file:// paths so self-hosted fonts load in headless
// - Awaits document.fonts.ready before page.pdf() so fonts are fully loaded
// - Auto-fit: binary-search font-size to fit within a max page count

import path from "node:path";
import fs from "node:fs";
import type { Browser as PuppeteerBrowser } from "puppeteer-core";
import { PAGE_MARGINS } from "./page-geometry";

const isVercel = !!process.env.VERCEL;

export interface RenderOptions {
  format?: "A4" | "Letter";
  printBackground?: boolean;
  /** NOT used for margins — @page CSS is the single source of truth.
   *  Kept for backward compat but ignored when preferCSSPageSize is true. */
  margin?: { top?: string; bottom?: string; left?: string; right?: string };
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  /** Max pages — triggers auto-fit binary search */
  maxPages?: number;
  /** Called with the final page count + font size after rendering */
  onResult?: (info: { pageCount: number; fontSize: string }) => void;
}

// ---- Font file resolution for headless Chromium ----
// Replaces /fonts/ relative URLs with file:// absolute paths so fonts
// load in setContent() context (which has no base URL).
function resolveFontUrls(html: string): string {
  // In local dev, fonts are in /public/fonts/ — resolve to absolute file path
  const publicFontsDir = path.join(process.cwd(), "public", "fonts");
  // In Vercel, write fonts to /tmp/fonts (if not already there)
  if (isVercel) {
    const tmpFonts = "/tmp/fonts";
    if (!fs.existsSync(tmpFonts)) {
      try {
        fs.mkdirSync(tmpFonts, { recursive: true });
        // Copy from node_modules or bundled location
        const srcDir = path.join(process.cwd(), "public", "fonts");
        if (fs.existsSync(srcDir)) {
          for (const f of fs.readdirSync(srcDir)) {
            fs.copyFileSync(path.join(srcDir, f), path.join(tmpFonts, f));
          }
        }
      } catch { /* ignore */ }
    }
    return html.replace(/url\('\/fonts\//g, `url('file://${tmpFonts}/`);
  }
  // Local: use absolute path to /public/fonts
  return html.replace(/url\('\/fonts\//g, `url('file://${publicFontsDir}/`);
}

// ---- Playwright (local dev) ----
let playwrightBrowserPromise: Promise<unknown> | null = null;

async function getPlaywrightBrowser() {
  const { chromium } = await import("playwright");
  if (playwrightBrowserPromise) {
    try {
      const browser = (await playwrightBrowserPromise) as { isConnected: () => boolean };
      if (browser.isConnected()) return browser;
    } catch { /* relaunch */ }
  }
  playwrightBrowserPromise = chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  return playwrightBrowserPromise;
}

// ---- Puppeteer (Vercel) ----
const SPARTICUZ_CHROMIUM_VERSION = "149";

async function getPuppeteerBrowser(): Promise<PuppeteerBrowser> {
  const puppeteer = await import("puppeteer-core");
  const chromiumModule = await import("@sparticuz/chromium");
  const chromium = (chromiumModule.default ?? chromiumModule) as {
    executablePath: (input?: string) => Promise<string>;
    args: string[];
  };
  const cdnUrl = `https://github.com/Sparticuz/chromium/releases/download/v${SPARTICUZ_CHROMIUM_VERSION}/chromium-v${SPARTICUZ_CHROMIUM_VERSION}-pack.tar`;
  let executablePath: string;
  const localBin = resolveLocalBinPath();
  if (localBin) {
    try { executablePath = await chromium.executablePath(localBin); }
    catch { console.error("[pdf] local bin failed, CDN:", cdnUrl); executablePath = await chromium.executablePath(cdnUrl); }
  } else {
    console.error("[pdf] no local bin, CDN:", cdnUrl);
    executablePath = await chromium.executablePath(cdnUrl);
  }
  return puppeteer.launch({ args: chromium.args, executablePath, headless: true });
}

function resolveLocalBinPath(): string {
  const candidates = [
    path.join(process.cwd(), "node_modules/@sparticuz/chromium/bin"),
    "/var/task/node_modules/@sparticuz/chromium/bin",
    "/var/task/nodejs/node_modules/@sparticuz/chromium/bin",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return "";
}

// ---- Main render function ----

export async function renderHtmlToPdf(
  html: string,
  options: RenderOptions = {},
): Promise<Buffer> {
  // Replace /fonts/ with file:// URLs for headless Chromium
  const resolvedHtml = resolveFontUrls(html);

  if (isVercel) {
    return renderWithPuppeteer(resolvedHtml, options);
  }
  return renderWithPlaywright(resolvedHtml, options);
}

// ---- Shared PDF options (no margin conflict) ----
function buildPdfOptions(options: RenderOptions) {
  return {
    format: options.format ?? "A4",
    printBackground: options.printBackground ?? true,
    // NO margin here — @page CSS is the single source of truth
    preferCSSPageSize: true,
    displayHeaderFooter: options.displayHeaderFooter ?? false,
    headerTemplate: "<div></div>",
    footerTemplate: options.footerTemplate || "<div></div>",
  };
}

// ---- Auto-fit: binary search font-size to fit max pages ----
async function autoFitAndRender(
  page: { evaluate: (fn: () => unknown, ...args: unknown[]) => Promise<unknown>; pdf: (opts: Record<string, unknown>) => Promise<Buffer> },
  options: RenderOptions,
): Promise<{ buffer: Buffer; pageCount: number; fontSize: string }> {
  const pdfOpts = buildPdfOptions(options);
  const maxPages = options.maxPages;

  // If no max pages, just render once
  if (!maxPages) {
    const pdf = await page.pdf(pdfOpts);
    const pageCount = estimatePageCount(pdf);
    return { buffer: pdf, pageCount, fontSize: "" };
  }

  // Binary search: try preferred size first, then shrink if over limit
  // Sizes to try (descending): preferred → 10.5pt → 10pt → 9.5pt → 9pt
  const sizes = ["10.5pt", "10pt", "9.5pt", "9pt"];
  let bestResult: Buffer | null = null;
  let bestPages = 99;
  let bestSize = "";

  for (const size of sizes) {
    await page.evaluate((fs: string) => {
      document.documentElement.style.setProperty("--fs-body", fs);
      document.documentElement.style.setProperty("--fs-heading", `calc(${fs} + 1.5pt)`);
    }, size);

    const pdf = await page.pdf(pdfOpts);
    const pages = estimatePageCount(pdf);
    bestResult = pdf;
    bestPages = pages;
    bestSize = size;

    if (pages <= maxPages) break; // Fits!
  }

  return { buffer: bestResult!, pageCount: bestPages, fontSize: bestSize };
}

// Estimate page count from PDF buffer (rough: check for /Type /Page)
function estimatePageCount(pdf: Buffer): number {
  const str = pdf.toString("latin1");
  const matches = str.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

// ---- Puppeteer path ----
async function renderWithPuppeteer(html: string, options: RenderOptions): Promise<Buffer> {
  const browser = await getPuppeteerBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 });

    // Wait for fonts to be ready
    await page.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready).catch(() => {});
    // Wait for images
    await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
    }).catch(() => {});

    const { buffer, pageCount, fontSize } = await autoFitAndRender(page as unknown as { evaluate: (fn: () => unknown, ...args: unknown[]) => Promise<unknown>; pdf: (opts: Record<string, unknown>) => Promise<Buffer> }, options);
    options.onResult?.({ pageCount, fontSize });
    return buffer;
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---- Playwright path ----
async function renderWithPlaywright(html: string, options: RenderOptions): Promise<Buffer> {
  const browser = (await getPlaywrightBrowser()) as {
    newContext: () => Promise<{
      newPage: () => Promise<{
        setContent: (html: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<void>;
        evaluate: (fn: () => unknown, ...args: unknown[]) => Promise<unknown>;
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
    // Wait for fonts
    await page.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready).catch(() => {});
    // Wait for images
    await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
    }).catch(() => {});

    const { buffer, pageCount, fontSize } = await autoFitAndRender(page as unknown as { evaluate: (fn: () => unknown, ...args: unknown[]) => Promise<unknown>; pdf: (opts: Record<string, unknown>) => Promise<Buffer> }, options);
    options.onResult?.({ pageCount, fontSize });
    return buffer;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
