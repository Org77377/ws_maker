"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { QuestionCard } from "./question-card";
import { PencilLine, Plus, Layers } from "lucide-react";
import type { Question, QuestionType } from "@/lib/worksheet/types";

export function QuestionEditor() {
  const {
    questions,
    sections,
    mode,
    reorderQuestions,
    addQuestion,
    addQuestionToSection,
  } = useWorksheetStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const orderedIds = useMemo(() => questions.map((q) => q.id), [questions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    reorderQuestions(next);
  };

  const isExam = mode === "exam";

  // In exam mode, group questions by section
  if (isExam && sections.length > 0) {
    return (
      <ExamSectionEditor
        questions={questions}
        sections={sections}
        addQuestionToSection={addQuestionToSection}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        orderedIds={orderedIds}
        totalCount={questions.length}
      />
    );
  }

  // Worksheet mode (or exam with no sections) — flat list
  return (
    <Card
      id="question-editor"
      className="border-border/60 shadow-sm scroll-mt-4"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary sm:text-base">
            <PencilLine className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">Question Editor</span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              ({questions.length})
            </span>
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addQuestion()}
            className="h-9 shrink-0 sm:h-8"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center sm:p-8">
            <p className="text-sm text-muted-foreground">
              No questions yet. Paste your questions above and tap{" "}
              <span className="font-medium text-foreground">
                Parse Questions
              </span>
              , or add one manually.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 sm:space-y-2.5">
                {questions.map((q, idx) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    total={questions.length}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Exam mode: section-wise question editor ----

interface ExamSectionEditorProps {
  questions: Question[];
  sections: ReturnType<typeof useWorksheetStore.getState>["sections"];
  addQuestionToSection: (
    sectionId: string,
    type?: QuestionType,
  ) => string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  orderedIds: string[];
  totalCount: number;
}

function ExamSectionEditor({
  questions,
  sections,
  addQuestionToSection,
  sensors,
  onDragEnd,
  orderedIds,
  totalCount,
}: ExamSectionEditorProps) {
  // Build a map of sectionId → questions in that section
  const sectionQuestions = useMemo(() => {
    const map = new Map<string, Question[]>();
    const assignedIds = new Set<string>();

    for (const sec of sections) {
      const sqs: Question[] = [];
      for (const qId of sec.questionIds) {
        const q = questions.find((qq) => qq.id === qId);
        if (q) {
          sqs.push(q);
          assignedIds.add(qId);
        }
      }
      map.set(sec.id, sqs);
    }

    // Unassigned questions
    const unassigned = questions.filter((q) => !assignedIds.has(q.id));
    map.set("__unassigned", unassigned);

    return map;
  }, [questions, sections]);

  return (
    <Card
      id="question-editor"
      className="border-border/60 shadow-sm scroll-mt-4"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary sm:text-base">
            <PencilLine className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">Questions</span>
            <Badge
              variant="secondary"
              className="shrink-0 bg-primary/10 text-[10px] font-bold text-primary"
            >
              {totalCount}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render each section with its questions */}
        {sections.map((sec, i) => {
          const sqs = sectionQuestions.get(sec.id) || [];
          const secOrderedIds = sqs.map((q) => q.id);
          return (
            <div
              key={sec.id}
              className="rounded-lg border border-border/60 bg-muted/10 p-2.5"
            >
              {/* Section header */}
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {sec.title}
                  </span>
                  {sec.instruction && (
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      — {sec.instruction}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border/60 text-[10px] font-medium text-muted-foreground"
                  >
                    {sqs.length} Q
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addQuestionToSection(sec.id)}
                  className="h-8 shrink-0 gap-1 text-xs text-accent hover:bg-accent/10 hover:text-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to section
                </Button>
              </div>
              {/* Section questions */}
              {sqs.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  No questions in this section yet. Tap &ldquo;Add to
                  section&rdquo; or assign questions from the main list.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={secOrderedIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {sqs.map((q) => {
                        const idx = questions.findIndex(
                          (qq) => qq.id === q.id,
                        );
                        return (
                          <QuestionCard
                            key={q.id}
                            question={q}
                            index={idx}
                            total={totalCount}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          );
        })}

        {/* Unassigned questions */}
        {sectionQuestions.get("__unassigned")?.length ? (
          <div className="rounded-lg border border-dashed border-border/60 p-2.5">
            <div className="mb-2 flex items-center gap-2 border-b border-border/60 pb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                Unassigned Questions
              </span>
              <Badge
                variant="outline"
                className="border-border/60 text-[10px] font-medium text-muted-foreground"
              >
                {sectionQuestions.get("__unassigned")!.length} Q
              </Badge>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={orderedIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sectionQuestions.get("__unassigned")!.map((q) => {
                    const idx = questions.findIndex(
                      (qq) => qq.id === q.id,
                    );
                    return (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={idx}
                        total={totalCount}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : null}

        {totalCount === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No questions yet. Use the AI Generate button or paste questions
            above, then assign them to sections.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
