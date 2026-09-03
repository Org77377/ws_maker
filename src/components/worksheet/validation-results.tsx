"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { validateQuestions, firstInvalidQuestion } from "@/lib/worksheet/validation";
import {
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  ListChecks,
  ArrowDown,
} from "lucide-react";

export function ValidationResults() {
  const { questions, setLastFocusedQuestionId } = useWorksheetStore();

  const result = useMemo(() => validateQuestions(questions), [questions]);

  if (questions.length === 0) return null;

  const allValid = !result.hasBlockingErrors;

  const handleFixErrors = () => {
    const q = firstInvalidQuestion(questions, result);
    if (q) setLastFocusedQuestionId(q.id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => {
        document
          .getElementById("question-editor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <Card
      className={
        allValid
          ? "border-emerald-200 bg-emerald-50/50 shadow-sm"
          : "border-amber-200 bg-amber-50/50 shadow-sm"
      }
    >
      <CardContent className="py-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            {allValid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <span
              className={
                allValid
                  ? "text-sm font-semibold text-emerald-700"
                  : "text-sm font-semibold text-amber-700"
              }
            >
              {allValid ? "All Questions Valid" : "Needs Attention"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 font-medium">
              <ListChecks className="h-3 w-3" />
              {questions.length} Questions
            </Badge>
            <Badge variant="secondary" className="font-medium">
              {result.totalOptions} Options
            </Badge>
            <Badge
              variant="secondary"
              className={
                result.validCount === questions.length
                  ? "bg-emerald-100 text-emerald-700"
                  : ""
              }
            >
              {result.validCount} Valid
            </Badge>
            {result.errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <CircleAlert className="h-3 w-3" />
                {result.errorCount} Error{result.errorCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          {!allValid && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleFixErrors}
              className="ml-auto h-8 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Fix Errors
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {result.issues.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-amber-200/60 pt-3">
            {result.issues.slice(0, 6).map((issue, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 text-[12px] leading-snug text-foreground/80"
              >
                <AlertTriangle
                  className={
                    issue.severity === "error"
                      ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                      : "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  }
                />
                <span>{issue.message}</span>
              </li>
            ))}
            {result.issues.length > 6 && (
              <li className="text-[11px] italic text-muted-foreground">
                + {result.issues.length - 6} more issue
                {result.issues.length - 6 === 1 ? "" : "s"}…
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
