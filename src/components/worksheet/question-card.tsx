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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { validateQuestions } from "@/lib/worksheet/validation";
import type { Question } from "@/lib/worksheet/types";
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
          !isValid && "border-amber-300",
        )}
      >
        <CardContent className="p-0">
          {/* Header row */}
          <div className="flex items-center gap-1.5 p-2.5">
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <Badge
              variant="secondary"
              className="h-6 min-w-[1.75rem] justify-center bg-primary text-primary-foreground"
            >
              {question.number}
            </Badge>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex flex-1 items-center gap-2 truncate text-left"
            >
              <span
                className={cn(
                  "truncate text-sm",
                  question.text
                    ? "text-foreground"
                    : "italic text-muted-foreground",
                )}
              >
                {question.text || "Empty question — click to edit"}
              </span>
              {correctLabel && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-accent/40 text-[10px] text-accent"
                >
                  Ans: {correctLabel}
                </Badge>
              )}
            </button>

            {!isValid && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
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
                  className="h-7 w-7"
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
            <div className="space-y-3 border-t border-border/60 p-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Question text
                </label>
                <Textarea
                  value={question.text}
                  onChange={(e) => updateQuestionText(question.id, e.target.value)}
                  placeholder="Enter the question..."
                  className="min-h-[60px] resize-y text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Options
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Select the correct answer
                  </span>
                </div>
                <div className="space-y-1.5">
                  {question.options.map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption(question.id, opt.label)}
                        title="Mark as correct answer"
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                          opt.correct
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border text-muted-foreground hover:border-accent/50",
                        )}
                      >
                        {opt.correct ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          opt.label
                        )}
                      </button>
                      <Input
                        value={opt.text}
                        onChange={(e) =>
                          updateOptionText(question.id, opt.label, e.target.value)
                        }
                        placeholder={`Option ${opt.label} text`}
                        className="h-8 border-transparent bg-background text-sm"
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(question.id, opt.label)}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove option ${opt.label}`}
                        >
                          <X className="h-3.5 w-3.5" />
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
                    className="h-7 text-xs text-muted-foreground"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add option
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
