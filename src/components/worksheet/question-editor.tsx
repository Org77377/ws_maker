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
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { QuestionCard } from "./question-card";
import { PencilLine, Plus } from "lucide-react";

export function QuestionEditor() {
  const { questions, reorderQuestions, addQuestion } = useWorksheetStore();

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

  return (
    <Card id="question-editor" className="border-border/60 shadow-sm scroll-mt-4">
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
            onClick={addQuestion}
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
              <span className="font-medium text-foreground">Parse Questions</span>
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
