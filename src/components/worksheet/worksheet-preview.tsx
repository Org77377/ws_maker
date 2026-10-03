"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { useGeneratePdf } from "@/hooks/use-generate-pdf";
import { buildWorksheetHtml } from "@/lib/pdf/template";
import { buildExamHtml } from "@/lib/pdf/exam-template";
import { PRINT_PRESETS } from "@/lib/pdf/page-geometry";
import type { Worksheet } from "@/lib/worksheet/types";
import { Eye, Printer, Loader2, FileType } from "lucide-react";

// A4 width in CSS pixels at 96dpi: 210mm ≈ 793.7px
const A4_WIDTH_PX = 794;

/** Build a preview-friendly header image URL.
 *  Google Drive images cannot be hotlinked directly in the browser, so we route
 *  them through the /api/header-image proxy, which fetches + trims the banner's
 *  built-in bottom rule server-side (same logic the PDF uses). Non-Google-Drive
 *  URLs are used as-is. */
function toEmbeddable(src: string): string {
  if (!src) return "";
  const isGoogleDrive = src.includes("drive.google.com");
  if (isGoogleDrive) {
    return `/api/header-image?url=${encodeURIComponent(src)}`;
  }
  return src;
}

export function WorksheetPreview() {
  const worksheet = useWorksheetStore(
    useShallow((s) => ({
      mode: s.mode,
      schoolHeaderImage: s.schoolHeaderImage,
      className: s.className,
      subject: s.subject,
      chapterNumber: s.chapterNumber,
      chapterName: s.chapterName,
      section: s.section,
      rollNo: s.rollNo,
      answerMode: s.answerMode,
      worksheetHeading: s.worksheetHeading,
      questions: s.questions,
      sections: s.sections,
      examMeta: s.examMeta,
    })),
  ) as Worksheet;
  const { generate, isGenerating } = useGeneratePdf();

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [containerWidth, setContainerWidth] = useState(A4_WIDTH_PX);
  const [pageCount, setPageCount] = useState(1);

  // Observe container width for responsive scaling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const headerUrl = useMemo(
    () => toEmbeddable(worksheet.schoolHeaderImage),
    [worksheet.schoolHeaderImage],
  );

  const printPreset = useWorksheetStore((s) => s.printPreset);
  const marksPosition = useWorksheetStore((s) => s.marksPosition);

  const html = useMemo(
    () =>
      worksheet.mode === "exam"
        ? buildExamHtml({
            worksheet,
            headerImage: headerUrl || undefined,
            preset: PRINT_PRESETS[printPreset] || PRINT_PRESETS.standard,
            marksPosition,
          })
        : buildWorksheetHtml({
            worksheet,
            headerImage: headerUrl || undefined,
          }),
    [worksheet, headerUrl, printPreset, marksPosition],
  );

  const scale = Math.min(1, containerWidth / A4_WIDTH_PX);

  // After the iframe loads, measure its content height to size the wrapper,
  // and estimate the page count from A4 height (1123px at 96dpi).
  // A short retry covers cases where the content isn't laid out yet on the
  // first load event (e.g. when switching from a hidden tab).
  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const measure = (retries = 5) => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const height = doc.body.scrollHeight;
        if (height > 0) {
          iframe.style.height = `${height}px`;
          const A4_HEIGHT_PX = 1123;
          setPageCount(Math.max(1, Math.ceil(height / A4_HEIGHT_PX)));
        } else if (retries > 0) {
          setTimeout(() => measure(retries - 1), 100);
        }
      } catch {
        /* cross-origin — ignore */
      }
    };
    measure();
  }, []);

  return (
    <Card className="border-border/60 shadow-sm lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary sm:text-base">
            <Eye className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">Live Preview</span>
            <span className="sm:hidden">Preview</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
              A4 · {pageCount}p
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="scroll-thin max-h-[calc(100vh-220px)] overflow-y-auto rounded-lg bg-muted/40 p-2 sm:p-3 lg:max-h-[calc(100vh-200px)]"
        >
          <div
            style={{
              width: A4_WIDTH_PX * scale,
              height: "auto",
            }}
            className="relative mx-auto"
          >
            <iframe
              ref={iframeRef}
              title="Worksheet preview"
              srcDoc={html}
              onLoad={handleLoad}
              style={{
                width: A4_WIDTH_PX,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                height: 1123,
                border: "none",
                background: "white",
                boxShadow: "0 4px 24px rgba(15, 23, 42, 0.10)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* Generate buttons — desktop only (mobile uses the bottom tab bar) */}
        <div className="mt-4 hidden gap-2 lg:flex">
          <Button
            type="button"
            onClick={() => generate("pdf")}
            disabled={isGenerating || worksheet.questions.length === 0}
            className="h-11 flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={() => generate("docx")}
            disabled={isGenerating || worksheet.questions.length === 0}
            className="h-11 gap-2 bg-accent px-6 text-primary-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            <FileType className="h-4 w-4" />
            DOCX
          </Button>
        </div>
        {worksheet.questions.length === 0 && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Add or parse questions to enable PDF generation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
