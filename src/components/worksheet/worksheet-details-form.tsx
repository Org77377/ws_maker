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
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { DEFAULT_HEADER_IMAGE } from "@/lib/worksheet/types";
import { School, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function WorksheetDetailsForm() {
  const {
    className,
    subject,
    chapterNumber,
    chapterName,
    section,
    rollNo,
    schoolHeaderImage,
    setClassName,
    setSubject,
    setChapterNumber,
    setChapterName,
    setSection,
    setRollNo,
    setSchoolHeaderImage,
  } = useWorksheetStore();

  // Collapsed by default on mobile (expanded on desktop via CSS open state).
  // We keep it open by default so users see the fields; they can collapse to
  // save space after filling them in.
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
              <School className="h-4 w-4 text-accent" />
              Worksheet Details
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
            {/* Row 1: Class / Section / Roll No */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="ws-class"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Class
                </Label>
                <Input
                  id="ws-class"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="VII"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ws-section"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Section
                </Label>
                <Input
                  id="ws-section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="A"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ws-roll"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Roll No
                </Label>
                <Input
                  id="ws-roll"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="—"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
            </div>
            {/* Row 2: Subject / Chapter Name */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="ws-subject"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Subject
                </Label>
                <Input
                  id="ws-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Computer Science"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ws-chap-name"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Chapter Name
                </Label>
                <Input
                  id="ws-chap-name"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  placeholder="Introduction to Krita"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
            </div>
            {/* Chapter number (drives MCQs heading) */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="ws-chap-no"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Chapter No.{" "}
                  <span className="font-normal text-muted-foreground/70">
                    (for MCQs heading)
                  </span>
                </Label>
                <Input
                  id="ws-chap-no"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  placeholder="4"
                  inputMode="numeric"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="ws-header"
                className="text-xs font-medium text-muted-foreground"
              >
                School Header Image URL
              </Label>
              <Input
                id="ws-header"
                value={schoolHeaderImage}
                onChange={(e) => setSchoolHeaderImage(e.target.value)}
                placeholder="Paste image or Google Drive link"
                className="h-11 text-base sm:h-10 sm:text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Google Drive links supported.
                </p>
                <button
                  type="button"
                  onClick={() => setSchoolHeaderImage(DEFAULT_HEADER_IMAGE)}
                  className="shrink-0 text-[11px] font-medium text-accent hover:underline"
                >
                  Reset default
                </button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
