"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { ClipboardList, ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ExamMetaForm() {
  const {
    examMeta,
    setExamMeta,
    updateExamInstruction,
    addExamInstruction,
    removeExamInstruction,
  } = useWorksheetStore();

  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
              <ClipboardList className="h-4 w-4 text-accent" />
              Exam Details
            </CardTitle>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform lg:hidden",
                open && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent className="CollapsibleContent data-[state=closed]:hidden lg:data-[state=closed]:block">
          <CardContent className="space-y-4 pt-0">
            {/* Exam Title (full width) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="exam-title"
                className="text-xs font-medium text-muted-foreground"
              >
                Exam Title
              </Label>
              <Input
                id="exam-title"
                value={examMeta.examTitle}
                onChange={(e) =>
                  setExamMeta({ examTitle: e.target.value })
                }
                placeholder="Mid-Term Examination"
                className="h-11 text-base sm:h-10 sm:text-sm"
              />
            </div>

            {/* Row: Grade / Subject */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-grade"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Grade
                </Label>
                <Input
                  id="exam-grade"
                  value={examMeta.grade}
                  onChange={(e) => setExamMeta({ grade: e.target.value })}
                  placeholder="8"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-subject"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Subject
                </Label>
                <Input
                  id="exam-subject"
                  value={examMeta.subject}
                  onChange={(e) => setExamMeta({ subject: e.target.value })}
                  placeholder="Computer Science"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            {/* Row: Max Marks / Duration / Date */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-marks"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Max Marks
                </Label>
                <Input
                  id="exam-marks"
                  value={examMeta.maxMarks}
                  onChange={(e) => setExamMeta({ maxMarks: e.target.value })}
                  placeholder="80"
                  inputMode="numeric"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-duration"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Duration
                </Label>
                <Input
                  id="exam-duration"
                  value={examMeta.duration}
                  onChange={(e) => setExamMeta({ duration: e.target.value })}
                  placeholder="3 Hours"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Date
                </Label>
                <Input
                  id="exam-date"
                  value={examMeta.date}
                  onChange={(e) => setExamMeta({ date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            {/* General Instructions list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  General Instructions
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addExamInstruction()}
                  className="h-8 px-2 text-xs font-medium text-accent hover:bg-accent/10 hover:text-accent sm:h-7"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {examMeta.instructions.length === 0 && (
                  <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                    No instructions yet. Tap “Add” to create the first one.
                  </p>
                )}
                {examMeta.instructions.map((ins, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-2"
                  >
                    <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <Input
                      value={ins}
                      onChange={(e) =>
                        updateExamInstruction(i, e.target.value)
                      }
                      placeholder={`Instruction ${i + 1}`}
                      className="h-10 flex-1 border-transparent bg-background text-[15px] sm:h-9 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeExamInstruction(i)}
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                      aria-label={`Remove instruction ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
