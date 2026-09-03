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
          "space-y-4",
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

      {/* ===== Mobile bottom bar: Edit/Preview tabs + Generate PDF ===== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden">
        {/* Generate button row (only when questions exist) */}
        {canGenerate && (
          <div className="px-3 pt-2.5">
            <Button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        )}
        {/* Tab bar */}
        <div className="grid grid-cols-2 gap-1 p-2">
          <button
            type="button"
            onClick={() => setMobileView("edit")}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
              mobileView === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <PencilLine className="h-4 w-4" />
            Edit
            {questions.length > 0 && (
              <span
                className={cn(
                  "rounded px-1 text-[10px]",
                  mobileView === "edit"
                    ? "bg-primary-foreground/20"
                    : "bg-muted",
                )}
              >
                {questions.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
              mobileView === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
