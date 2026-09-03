// PDF rendering mini-service (Playwright + Bun).
// Port: 3031
//
// Endpoints:
//   GET  /health        -> { ok: true }
//   POST /render-pdf    -> { html: string, options?: PdfOptions } => application/pdf
//
// The service keeps a single shared browser instance and spawns a new page per
// request. Pages are closed immediately after rendering to free memory.

import { chromium, type Browser } from "playwright";

const PORT = 3031;

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return browser;
}

interface PdfOptions {
  format?: "A4" | "Letter";
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

async function renderPdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // setContent with waitUntil networkidle so Google Fonts / images load.
    await page.setContent(html, { waitUntil: "networkidle", timeout: 45000 });
    // Extra safety: wait briefly for any pending images.
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

    const pdfBuffer = await page.pdf({
      format: options.format ?? "A4",
      printBackground: options.printBackground ?? true,
      margin,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers for local dev (the Next API route calls us directly)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/health" && req.method === "GET") {
      return Response.json({ ok: true, port: PORT, service: "pdf-service" }, {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/render-pdf" && req.method === "POST") {
      try {
        const body = (await req.json()) as { html: string; options?: PdfOptions };
        if (!body.html) {
          return Response.json(
            { error: "Missing 'html' in request body" },
            { status: 400, headers: corsHeaders },
          );
        }
        const pdfBuffer = await renderPdf(body.html, body.options);
        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="worksheet.pdf"',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[pdf-service] render error:", message);
        return Response.json(
          { error: "PDF rendering failed", detail: message },
          { status: 500, headers: corsHeaders },
        );
      }
    }

    return Response.json(
      { error: "Not found", path: url.pathname },
      { status: 404, headers: corsHeaders },
    );
  },
});

// Global error handlers — never die silently
process.on("uncaughtException", (err) => {
  console.error("[pdf-service] uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[pdf-service] unhandledRejection:", err);
});

console.log(`[pdf-service] listening on http://localhost:${PORT}`);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[pdf-service] shutting down...");
  await browser?.close().catch(() => {});
  server.stop();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await browser?.close().catch(() => {});
  server.stop();
  process.exit(0);
});
