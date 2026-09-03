"use client";

import { useSyncExternalStore } from "react";
import { WorksheetDetailsForm } from "@/components/worksheet/worksheet-details-form";
import { QuestionInput } from "@/components/worksheet/question-input";
import { ValidationResults } from "@/components/worksheet/validation-results";
import { QuestionEditor } from "@/components/worksheet/question-editor";
import { SettingsPanel } from "@/components/worksheet/settings-panel";
import { WorksheetPreview } from "@/components/worksheet/worksheet-preview";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { useGeneratePdf } from "@/hooks/use-generate-pdf";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Printer } from "lucide-react";

// SSR-safe "mounted" check without setState-in-effect.
const emptySubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;
function useMounted() {
  return useSyncExternalStore(emptySubscribe, getTrue, getFalse);
}

export function WorksheetApp() {
  const mounted = useMounted();
  const questions = useWorksheetStore((s) => s.questions);
  const { generate, isGenerating } = useGeneratePdf();

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canGenerate = questions.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left: controls */}
      <div className="space-y-4">
        <WorksheetDetailsForm />
        <QuestionInput />
        <ValidationResults />
        <QuestionEditor />
        <SettingsPanel />

        {/* Desktop generate button (mobile uses sticky bar below) */}
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

      {/* Right: live A4 preview */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <WorksheetPreview />
      </div>

      {/* Mobile sticky generate bar */}
      {canGenerate && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <Button
            type="button"
            onClick={generate}
            disabled={isGenerating}
            className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-5 w-5" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
