"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { FileText, ScrollText } from "lucide-react";

/**
 * Compact mode switcher: Worksheet vs Exam.
 * Switching to "exam" shows the exam meta form; switching to "worksheet"
 * shows the worksheet details form. The actual forms are rendered
 * conditionally by the parent (WorksheetApp).
 */
export function ModeToggle() {
  const mode = useWorksheetStore((s) => s.mode);
  const setMode = useWorksheetStore((s) => s.setMode);

  return (
    <Card className="border-border/60 p-1.5 shadow-sm">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setMode("worksheet")}
          aria-pressed={mode === "worksheet"}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
            mode === "worksheet"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <FileText className="h-4 w-4" />
          Worksheet
        </button>
        <button
          type="button"
          onClick={() => setMode("exam")}
          aria-pressed={mode === "exam"}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
            mode === "exam"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <ScrollText className="h-4 w-4" />
          Exam Paper
        </button>
      </div>
    </Card>
  );
}
