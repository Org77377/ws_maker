import { NextRequest, NextResponse } from "next/server";
import { buildFilename, buildWorksheetHtml } from "@/lib/pdf/template";
import {
  buildExamFilename,
  buildExamHtml,
} from "@/lib/pdf/exam-template";
import type { Worksheet } from "@/lib/worksheet/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GenerateDocxBody {
  worksheet: Worksheet;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateDocxBody;
    const worksheet = body?.worksheet;

    if (!worksheet) {
      return NextResponse.json(
        { error: "Missing worksheet data." },
        { status: 400 },
      );
    }

    if (!Array.isArray(worksheet.questions) || worksheet.questions.length === 0) {
      return NextResponse.json(
        { error: "Cannot generate DOCX: no questions provided." },
        { status: 400 },
      );
    }

    const isExam = worksheet.mode === "exam";
    const html = isExam
      ? buildExamHtml({ worksheet })
      : buildWorksheetHtml({ worksheet });

    // Convert HTML to DOCX using html-to-docx
    const HTMLtoDocx = (await import("html-to-docx")).default;
    const docxBuffer = await HTMLtoDocx(html, null, {
      table: { row: { cantSplitRow: true },
        cell: { verticalAlign: "center" } },
      footer: isExam,
      pageNumber: isExam,
    });

    const filename = isExam
      ? buildExamFilename(worksheet).replace(/\.pdf$/, ".docx")
      : buildFilename(worksheet).replace(/\.pdf$/, ".docx");

    return new NextResponse(docxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(docxBuffer.byteLength || docxBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-docx] error:", message);
    return NextResponse.json(
      { error: "DOCX generation failed.", detail: message },
      { status: 500 },
    );
  }
}
