"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { ClipboardList, Sparkles, Eraser, ScrollText } from "lucide-react";

export function QuestionInput() {
  const {
    rawInput,
    setRawInput,
    parseInput,
    loadSample,
    loadExamSample,
    questions,
  } = useWorksheetStore();

  const handleParse = () => {
    parseInput();
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => {
        document
          .getElementById("question-editor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <ClipboardList className="h-4 w-4 text-accent" />
            Questions
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadSample}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              MCQ Sample
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadExamSample}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <ScrollText className="mr-1 h-3.5 w-3.5" />
              Exam Sample
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRawInput("")}
              disabled={!rawInput}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <Eraser className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={`Paste questions here. Type prefixes: M=MCQ, T=True/False, F=Fill, D=Descriptive.
Mark correct MCQ with * after the option. For fill, add "~ answer" at end.

M1. Which shortcut selects the entire worksheet?
A. Ctrl + A *
B. Ctrl + C

T2. Excel is a spreadsheet application.

F3. The active cell is identified by a ___ ~ border`}
          className="min-h-[200px] resize-y text-base leading-relaxed scroll-thin sm:text-[13px]"
          spellCheck={false}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {rawInput.trim()
              ? `${rawInput.trim().split(/\n\s*\n/).filter(Boolean).length} block(s) detected`
              : "Supports 1. / 1) / 1 formats · * marks correct"}
          </p>
          <Button
            type="button"
            onClick={handleParse}
            disabled={!rawInput.trim()}
            className="h-11 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:h-9 sm:text-sm"
          >
            Parse Questions
          </Button>
        </div>
        {questions.length > 0 && (
          <p className="text-[11px] text-accent">
            {questions.length} question{questions.length === 1 ? "" : "s"} parsed. Edit them below.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
