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
import { Badge } from "@/components/ui/badge";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { Layers, ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/worksheet/types";

export function SectionManager() {
  const { sections, addSection, updateSection, deleteSection } =
    useWorksheetStore();
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
              <Layers className="h-4 w-4 text-accent" />
              Sections
              {sections.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[1.25rem] justify-center bg-primary/10 px-1.5 text-[10px] font-bold text-primary"
                >
                  {sections.length}
                </Badge>
              )}
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
          <CardContent className="space-y-3 pt-0">
            {sections.length === 0 && (
              <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center">
                <p className="text-xs text-muted-foreground">
                  No sections yet. Add sections to group questions in your exam
                  paper. Each section shows a title, instruction, and marks
                  carriage (e.g. &ldquo;40 × 0.5 = 20&rdquo;).
                </p>
              </div>
            )}

            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {sections.map((section, i) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  index={i}
                  updateSection={updateSection}
                  deleteSection={deleteSection}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSection(`Section ${String.fromCharCode(65 + sections.length)}`)}
              className="h-10 w-full border-dashed text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:h-9"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Section
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SectionRow({
  section,
  index,
  updateSection,
  deleteSection,
}: {
  section: Section;
  index: number;
  updateSection: (id: string, patch: Partial<Section>) => void;
  deleteSection: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      {/* Row 1: badge + title + delete */}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {String.fromCharCode(65 + index)}
        </span>
        <Input
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
          placeholder="Section title"
          className="h-10 flex-1 border-transparent bg-background text-[15px] font-semibold sm:h-9 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => deleteSection(section.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
          aria-label={`Remove ${section.title || "section"}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Row 2: instruction */}
      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Instruction
        </Label>
        <Input
          value={section.instruction}
          onChange={(e) => updateSection(section.id, { instruction: e.target.value })}
          placeholder="Answer the following (any 5)"
          className="h-9 border-transparent bg-background text-sm"
        />
      </div>
      {/* Row 3: marks carriage — 3 compact inputs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Questions
          </Label>
          <Input
            value={section.questionCount}
            onChange={(e) => updateSection(section.id, { questionCount: e.target.value })}
            placeholder="40"
            inputMode="numeric"
            className="h-9 border-transparent bg-background text-center text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            × Marks each
          </Label>
          <Input
            value={section.perQuestionMarks}
            onChange={(e) => updateSection(section.id, { perQuestionMarks: e.target.value })}
            placeholder="0.5"
            inputMode="decimal"
            className="h-9 border-transparent bg-background text-center text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            = Total
          </Label>
          <Input
            value={section.marks}
            onChange={(e) => updateSection(section.id, { marks: e.target.value })}
            placeholder="20"
            inputMode="numeric"
            className="h-9 border-transparent bg-background text-center text-sm"
          />
        </div>
      </div>
      {section.questionCount && section.perQuestionMarks && section.marks && (
        <p className="text-center text-[11px] font-medium text-muted-foreground">
          Preview: {section.questionCount} × {section.perQuestionMarks} = {section.marks}
        </p>
      )}
    </div>
  );
}
