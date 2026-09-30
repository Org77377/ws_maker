import { NextRequest, NextResponse } from "next/server";
import { buildFilename, buildWorksheetHtml } from "@/lib/pdf/template";
import { buildExamFilename, buildExamHtml } from "@/lib/pdf/exam-template";
import { renderHtmlToPdf } from "@/lib/pdf/renderer";
import { resolveHeaderImageDataUrl } from "@/lib/pdf/header-image";
import type { Worksheet } from "@/lib/worksheet/types";

// Force Node.js runtime (Playwright needs native bindings) and dynamic rendering.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GeneratePdfBody {
  worksheet: Worksheet;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GeneratePdfBody;
    const worksheet = body?.worksheet;

    if (!worksheet) {
      return NextResponse.json(
        { error: "Missing worksheet data." },
        { status: 400 },
      );
    }

    if (!Array.isArray(worksheet.questions) || worksheet.questions.length === 0) {
      return NextResponse.json(
        { error: "Cannot generate PDF: no questions provided." },
        { status: 400 },
      );
    }

    // Resolve header image to a data URL (handles Google Drive + fallback).
    const headerDataUrl = await resolveHeaderImageDataUrl(
      worksheet.schoolHeaderImage,
    );

    // Route to the appropriate template based on document mode.
    const isExam = worksheet.mode === "exam";
    const html = isExam
      ? buildExamHtml({ worksheet, headerImage: headerDataUrl ?? undefined })
      : buildWorksheetHtml({
          worksheet,
          headerImage: headerDataUrl ?? undefined,
        });

    const pdfBuffer = await renderHtmlToPdf(html, {
      format: "A4",
      printBackground: true,
      margin: isExam
        ? { top: "12mm", bottom: "18mm", left: "18mm", right: "18mm" }
        : { top: "8mm", bottom: "15mm", left: "16mm", right: "16mm" },
    });

    const filename = isExam
      ? buildExamFilename(worksheet)
      : buildFilename(worksheet);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-pdf] error:", message);
    return NextResponse.json(
      { error: "PDF generation failed.", detail: message },
      { status: 500 },
    );
  }
}
