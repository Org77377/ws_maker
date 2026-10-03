import { NextRequest, NextResponse } from "next/server";
import { buildFilename, buildWorksheetHtml } from "@/lib/pdf/template";
import {
  buildExamFilename,
  buildExamFooterTemplate,
  buildExamHtml,
} from "@/lib/pdf/exam-template";
import { renderHtmlToPdf } from "@/lib/pdf/renderer";
import { resolveHeaderImageDataUrl } from "@/lib/pdf/header-image";
import { PRINT_PRESETS, DEFAULT_PRESET } from "@/lib/pdf/page-geometry";
import type { Worksheet } from "@/lib/worksheet/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GeneratePdfBody {
  worksheet: Worksheet;
  preset?: string;
  marksPosition?: "left" | "right";
  maxPages?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GeneratePdfBody;
    const worksheet = body?.worksheet;

    if (!worksheet) {
      return NextResponse.json({ error: "Missing worksheet data." }, { status: 400 });
    }
    if (!Array.isArray(worksheet.questions) || worksheet.questions.length === 0) {
      return NextResponse.json({ error: "Cannot generate PDF: no questions provided." }, { status: 400 });
    }

    const headerDataUrl = await resolveHeaderImageDataUrl(worksheet.schoolHeaderImage);

    const isExam = worksheet.mode === "exam";
    const presetName = body.preset || DEFAULT_PRESET;
    const preset = PRINT_PRESETS[presetName] || PRINT_PRESETS[DEFAULT_PRESET];
    const marksPosition = body.marksPosition || "right";
    const maxPages = body.maxPages;

    const html = isExam
      ? buildExamHtml({ worksheet, headerImage: headerDataUrl ?? undefined, preset, marksPosition })
      : buildWorksheetHtml({ worksheet, headerImage: headerDataUrl ?? undefined });

    let pageCount = 0;
    let fontSize = "";

    const pdfBuffer = await renderHtmlToPdf(html, {
      format: "A4",
      printBackground: true,
      // NO margin option — @page CSS is the single source of truth
      displayHeaderFooter: isExam,
      footerTemplate: isExam ? buildExamFooterTemplate(worksheet) : undefined,
      maxPages,
      onResult: (info) => {
        pageCount = info.pageCount;
        fontSize = info.fontSize;
      },
    });

    const filename = isExam ? buildExamFilename(worksheet) : buildFilename(worksheet);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
        "X-Page-Count": String(pageCount),
        "X-Font-Size": fontSize,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-pdf] error:", message);
    return NextResponse.json({ error: "PDF generation failed.", detail: message }, { status: 500 });
  }
}
