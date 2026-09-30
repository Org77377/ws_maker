"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { validateQuestions } from "@/lib/worksheet/validation";
import {
  QUESTION_TYPE_LABELS,
  type Question,
  type QuestionType,
} from "@/lib/worksheet/types";
import {
  GripVertical,
  ChevronDown,
  MoreVertical,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
}

const QUESTION_TYPE_VALUES: QuestionType[] = [
  "mcq",
  "descriptive",
  "fillBlank",
  "trueFalse",
];

export function QuestionCard({ question, index, total }: QuestionCardProps) {
  const {
    updateQuestionText,
    updateOptionText,
    setCorrectOption,
    addOption,
    removeOption,
    deleteQuestion,
    duplicateQuestion,
    moveQuestion,
    lastFocusedQuestionId,
    setLastFocusedQuestionId,
    setQuestionType,
    updateQuestionAnswer,
    updateQuestionMarks,
  } = useWorksheetStore();

  const [expanded, setExpanded] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const result = validateQuestions([question]);
  const isValid = !result.hasBlockingErrors;
  const isFocused = lastFocusedQuestionId === question.id;
  // A focused (invalid) question is force-shown expanded so the user can fix it.
  const showBody = expanded || isFocused;

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setLastFocusedQuestionId(null);
    }
  }, [isFocused, setLastFocusedQuestionId]);

  const correctLabel = question.options.find((o) => o.correct)?.label;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50")}>
      <Card
        ref={cardRef}
        className={cn(
          "border-border/60 transition-shadow",
          isDragging && "shadow-lg opacity-90",
          isFocused && "ring-2 ring-accent",
          !isValid && "border-amber-300 bg-amber-50/30",
        )}
      >
        <CardContent className="p-0">
          {/* Header row: drag handle + number badge + (question text + ans badge) + chevron + menu */}
          <div className="flex items-start gap-1.5 p-2.5 sm:p-3">
            <button
              type="button"
              className="mt-0.5 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground active:cursor-grabbing sm:h-7 sm:w-5"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <Badge
              variant="secondary"
              className="mt-0.5 h-6 min-w-[1.5rem] shrink-0 justify-center bg-primary text-[11px] font-bold text-primary-foreground"
            >
              {question.number}
            </Badge>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:gap-2"
            >
              <span
                className={cn(
                  "line-clamp-2 text-sm leading-snug sm:line-clamp-1",
                  question.text
                    ? "text-foreground"
                    : "italic text-muted-foreground",
                )}
              >
                {question.text || "Empty question — tap to edit"}
              </span>
              {correctLabel && (question.type === "mcq" || question.type === "trueFalse") && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-accent/40 bg-accent/5 text-[10px] font-semibold text-accent"
                >
                  Ans: {correctLabel}
                </Badge>
              )}
              {question.type !== "mcq" && question.type !== "trueFalse" && question.answer && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-accent/40 bg-accent/5 text-[10px] font-semibold text-accent"
                >
                  Ans: {question.answer.length > 20 ? question.answer.slice(0, 20) + "…" : question.answer}
                </Badge>
              )}
            </button>

            {!isValid && (
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:h-7 sm:w-7"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 h-8 w-8 shrink-0 sm:h-7 sm:w-7"
                  aria-label="Question actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => moveQuestion(question.id, "up")}
                  disabled={index === 0}
                >
                  <ArrowUp className="mr-2 h-3.5 w-3.5" />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => moveQuestion(question.id, "down")}
                  disabled={index === total - 1}
                >
                  <ArrowDown className="mr-2 h-3.5 w-3.5" />
                  Move down
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateQuestion(question.id)}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deleteQuestion(question.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Editable body */}
          {showBody && (
            <div className="space-y-3.5 border-t border-border/60 p-3 sm:p-4">
              {/* Type selector + marks row */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Type
                  </label>
                  <Select
                    value={question.type}
                    onValueChange={(v) =>
                      setQuestionType(question.id, v as QuestionType)
                    }
                  >
                    <SelectTrigger
                      className="h-10 w-full text-base sm:h-9 sm:text-sm"
                      aria-label="Question type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPE_VALUES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {QUESTION_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[88px] flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Marks
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={question.marks}
                    onChange={(e) =>
                      updateQuestionMarks(
                        question.id,
                        Math.max(0, Number(e.target.value) || 0),
                      )
                    }
                    inputMode="numeric"
                    className="h-10 text-base sm:h-9 sm:text-sm"
                  />
                </div>
              </div>

              {/* Question text */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Question
                </label>
                <Textarea
                  value={question.text}
                  onChange={(e) => updateQuestionText(question.id, e.target.value)}
                  placeholder={
                    question.type === "fillBlank"
                      ? "Enter the question — use ___ for blanks"
                      : "Enter the question..."
                  }
                  className="min-h-[68px] resize-y text-[15px] leading-relaxed sm:text-sm"
                />
              </div>

              {/* ===== MCQ editor ===== */}
              {question.type === "mcq" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Options
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Tap letter = correct
                    </span>
                  </div>
                  <div className="space-y-2">
                    {question.options.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2"
                      >
                        <button
                          type="button"
                          onClick={() => setCorrectOption(question.id, opt.label)}
                          title="Mark as correct answer"
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all sm:h-9 sm:w-9",
                            opt.correct
                              ? "border-accent bg-accent text-accent-foreground shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:border-accent/50 active:scale-95",
                          )}
                        >
                          {opt.correct ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            opt.label
                          )}
                        </button>
                        <Input
                          value={opt.text}
                          onChange={(e) =>
                            updateOptionText(question.id, opt.label, e.target.value)
                          }
                          placeholder={`Option ${opt.label}`}
                          className="h-10 flex-1 border-transparent bg-background text-[15px] sm:h-9 sm:text-sm"
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(question.id, opt.label)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                            aria-label={`Remove option ${opt.label}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {question.options.length < 6 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addOption(question.id)}
                      className="h-9 w-full text-xs font-medium text-muted-foreground hover:bg-muted sm:h-8 sm:w-auto"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add option
                    </Button>
                  )}
                </div>
              )}

              {/* ===== True/False editor ===== */}
              {question.type === "trueFalse" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Correct Answer
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Tap one to mark correct
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setCorrectOption(question.id, opt.label)}
                        className={cn(
                          "flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-base font-bold transition-all sm:h-11 sm:text-sm",
                          opt.correct
                            ? "border-accent bg-accent text-accent-foreground shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-accent/50 active:scale-[0.98]",
                        )}
                      >
                        {opt.correct && <Check className="h-4 w-4" />}
                        {opt.text || opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== Fill in the Blanks editor ===== */}
              {question.type === "fillBlank" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Correct Answer
                  </label>
                  <Input
                    value={question.answer}
                    onChange={(e) =>
                      updateQuestionAnswer(question.id, e.target.value)
                    }
                    placeholder="Type the answer that fills the blank"
                    className="h-10 text-base sm:h-9 sm:text-sm"
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Use <code className="font-mono">___</code> in the question text
                    above to mark where the blank appears.
                  </p>
                </div>
              )}

              {/* ===== Descriptive editor ===== */}
              {question.type === "descriptive" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Model Answer (optional)
                  </label>
                  <Textarea
                    value={question.answer}
                    onChange={(e) =>
                      updateQuestionAnswer(question.id, e.target.value)
                    }
                    placeholder="Type the model answer / key points students should cover..."
                    className="min-h-[90px] resize-y text-[15px] leading-relaxed sm:text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
