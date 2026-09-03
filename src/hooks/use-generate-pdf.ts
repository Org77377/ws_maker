"use client";

import { useCallback, useState } from "react";
import { useWorksheetStore } from "./use-worksheet";

export function useGeneratePdf() {
  const getWorksheet = useWorksheetStore((s) => s.getWorksheet);
  const setGenerating = useWorksheetStore((s) => s.setGenerating);
  const isGenerating = useWorksheetStore((s) => s.isGenerating);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (isGenerating) return;
    setError(null);
    setGenerating(true);
    try {
      const worksheet = getWorksheet();
      if (!worksheet.questions.length) {
        setError("No questions to generate.");
        return;
      }
      const res = await fetch("/api/generate-pdf", {
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
      a.download = m ? decodeURIComponent(m[1]) : "worksheet.pdf";
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
  }, [isGenerating, getWorksheet, setGenerating]);

  return { generate, isGenerating, error };
}
