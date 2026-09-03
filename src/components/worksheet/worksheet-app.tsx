"use client";

import { useState, useSyncExternalStore } from "react";
import { WorksheetDetailsForm } from "@/components/worksheet/worksheet-details-form";
import { QuestionInput } from "@/components/worksheet/question-input";
import { ValidationResults } from "@/components/worksheet/validation-results";
import { QuestionEditor } from "@/components/worksheet/question-editor";
import { SettingsPanel } from "@/components/worksheet/settings-panel";
import { WorksheetPreview } from "@/components/worksheet/worksheet-preview";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { useGeneratePdf } from "@/hooks/use-generate-pdf";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Loader2, PencilLine, Eye, Printer } from "lucide-react";

// SSR-safe "mounted" check without setState-in-effect.
const emptySubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;
function useMounted() {
  return useSyncExternalStore(emptySubscribe, getTrue, getFalse);
}

type MobileView = "edit" | "preview";

export function WorksheetApp() {
  const mounted = useMounted();
  const questions = useWorksheetStore((s) => s.questions);
  const { generate, isGenerating } = useGeneratePdf();
  const [mobileView, setMobileView] = useState<MobileView>("edit");

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canGenerate = questions.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
      {/* ===== Left: controls (visible on desktop always; on mobile only in "edit" tab) ===== */}
      <div
        className={cn(
          "space-y-3 sm:space-y-4",
          mobileView === "preview" && "hidden lg:block",
        )}
      >
        <WorksheetDetailsForm />
        <QuestionInput />
        <ValidationResults />
        <QuestionEditor />
        <SettingsPanel />

        {/* Desktop generate button */}
        <Button
          type="button"
          onClick={generate}
          disabled={!canGenerate || isGenerating}
          className="hidden h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 lg:flex"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating your worksheet...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-5 w-5" />
              Generate PDF
            </>
          )}
        </Button>
      </div>

      {/* ===== Right: live A4 preview (visible on desktop always; on mobile only in "preview" tab) ===== */}
      <div
        className={cn(
          "lg:sticky lg:top-4 lg:self-start",
          mobileView === "edit" && "hidden lg:block",
        )}
      >
        <WorksheetPreview />
      </div>

      {/* ===== Mobile bottom bar: compact single row (Generate + tabs) =====
          Layout: [ Generate PDF button (flex-1) ] [ Edit | Preview ]
          This avoids the double-stack that wasted vertical space and keeps
          the primary action always visible. Respects the iOS safe-area inset. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 shadow-[0_-2px_12px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch gap-2 p-2">
          {/* Generate PDF — primary action, takes most of the width */}
          <Button
            type="button"
            onClick={generate}
            disabled={!canGenerate || isGenerating}
            className="h-12 flex-1 gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>

          {/* Tab switcher — compact segmented control */}
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setMobileView("edit")}
              aria-pressed={mobileView === "edit"}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                mobileView === "edit"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit
              {questions.length > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                    mobileView === "edit"
                      ? "bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground",
                  )}
                >
                  {questions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileView("preview")}
              aria-pressed={mobileView === "preview"}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                mobileView === "preview"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
