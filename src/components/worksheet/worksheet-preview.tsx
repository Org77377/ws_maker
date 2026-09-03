"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { useGeneratePdf } from "@/hooks/use-generate-pdf";
import { buildWorksheetHtml } from "@/lib/pdf/template";
import type { Worksheet } from "@/lib/worksheet/types";
import { Eye, Printer, Loader2 } from "lucide-react";

// A4 width in CSS pixels at 96dpi: 210mm ≈ 793.7px
const A4_WIDTH_PX = 794;

/** Convert a Google Drive share/view URL into a directly-embeddable URL. */
function toEmbeddable(src: string): string {
  if (!src) return "";
  const idMatch =
    src.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
    src.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
    src.match(/drive\.google\.com\/uc\?[^"]*id=([^&]+)/) ||
    src.match(/drive\.google\.com\/thumbnail\?[^"]*id=([^&]+)/);
  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
  }
  return src;
}

export function WorksheetPreview() {
  const worksheet = useWorksheetStore(
    useShallow((s) => ({
      schoolHeaderImage: s.schoolHeaderImage,
      className: s.className,
      subject: s.subject,
      chapterNumber: s.chapterNumber,
      chapterName: s.chapterName,
      answerMode: s.answerMode,
      questions: s.questions,
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

  const html = useMemo(
    () =>
      buildWorksheetHtml({
        worksheet,
        headerImage: headerUrl || undefined,
      }),
    [worksheet, headerUrl],
  );

  const scale = Math.min(1, containerWidth / A4_WIDTH_PX);

  // After the iframe loads, measure its content height to size the wrapper,
  // and estimate the page count from A4 height (1123px at 96dpi).
  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const height = doc.body.scrollHeight;
      iframe.style.height = `${height}px`;
      const A4_HEIGHT_PX = 1123;
      setPageCount(Math.max(1, Math.ceil(height / A4_HEIGHT_PX)));
    } catch {
      /* cross-origin — ignore */
    }
  }, []);

  const handleGenerate = () => {
    generate();
  };

  return (
    <Card className="sticky top-4 border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Eye className="h-4 w-4 text-accent" />
            Live Preview
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
              A4 · {pageCount} page{pageCount === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="scroll-thin max-h-[calc(100vh-220px)] overflow-y-auto rounded-lg bg-muted/40 p-3"
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

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || worksheet.questions.length === 0}
          className="mt-4 w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating your worksheet...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Generate PDF
            </>
          )}
        </Button>
        {worksheet.questions.length === 0 && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Add or parse questions to enable PDF generation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
