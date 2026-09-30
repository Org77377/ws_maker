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

export function SectionManager() {
  const {
    sections,
    addSection,
    updateSectionTitle,
    deleteSection,
  } = useWorksheetStore();

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
                  No sections yet. Group questions into sections for your exam
                  paper.
                </p>
              </div>
            )}

            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {sections.map((section, i) => (
                <div
                  key={section.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      updateSectionTitle(section.id, e.target.value)
                    }
                    placeholder="Section title"
                    className="h-10 flex-1 border-transparent bg-background text-[15px] sm:h-9 sm:text-sm"
                  />
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border/60 bg-background text-[10px] font-medium text-muted-foreground"
                    title={`${section.questionIds.length} question${
                      section.questionIds.length === 1 ? "" : "s"
                    } assigned`}
                  >
                    {section.questionIds.length} Q
                  </Badge>
                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                    aria-label={`Remove section ${section.title || i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSection("New Section")}
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
