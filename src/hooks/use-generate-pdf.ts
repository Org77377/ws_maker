"use client";

import { useCallback, useState } from "react";
import { useWorksheetStore } from "./use-worksheet";

type Format = "pdf" | "docx";

export function useGeneratePdf() {
  const getWorksheet = useWorksheetStore((s) => s.getWorksheet);
  const setGenerating = useWorksheetStore((s) => s.setGenerating);
  const isGenerating = useWorksheetStore((s) => s.isGenerating);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (format: Format = "pdf") => {
      if (isGenerating) return;
      setError(null);
      setGenerating(true);
      try {
        const worksheet = getWorksheet();
        if (!worksheet.questions.length) {
          setError("No questions to generate.");
          return;
        }
        const endpoint =
          format === "docx" ? "/api/generate-docx" : "/api/generate-pdf";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worksheet }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Request failed (${res.status})`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disp = res.headers.get("Content-Disposition") || "";
        const m = /filename="?([^"]+)"?/.exec(disp);
        a.download =
          m ? decodeURIComponent(m[1]) : `worksheet.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setGenerating(false);
      }
    },
    [isGenerating, getWorksheet, setGenerating],
  );

  return { generate, isGenerating, error };
}
