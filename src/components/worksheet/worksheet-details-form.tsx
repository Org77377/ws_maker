"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { DEFAULT_HEADER_IMAGE } from "@/lib/worksheet/types";
import { School } from "lucide-react";

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

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
          <School className="h-4 w-4 text-accent" />
          Worksheet Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1 of the worksheet header: Class / Section / Roll No (Name is a
            handwriting blank, so it is not a form field). */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ws-class" className="text-xs font-medium text-muted-foreground">
              Class
            </Label>
            <Input
              id="ws-class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. VII"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-section" className="text-xs font-medium text-muted-foreground">
              Section
            </Label>
            <Input
              id="ws-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. A"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-roll" className="text-xs font-medium text-muted-foreground">
              Roll No
            </Label>
            <Input
              id="ws-roll"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="blank → underline"
              className="h-10"
            />
          </div>
        </div>
        {/* Row 2 of the worksheet header: Subject / Chapter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ws-subject" className="text-xs font-medium text-muted-foreground">
              Subject
            </Label>
            <Input
              id="ws-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Computer Science"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-chap-name" className="text-xs font-medium text-muted-foreground">
              Chapter Name
            </Label>
            <Input
              id="ws-chap-name"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              placeholder="e.g. Introduction to Krita"
              className="h-10"
            />
          </div>
        </div>
        {/* Chapter number drives the "MCQs – Chapter N" heading. */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ws-chap-no" className="text-xs font-medium text-muted-foreground">
              Chapter No. <span className="font-normal text-muted-foreground/70">(for MCQs heading)</span>
            </Label>
            <Input
              id="ws-chap-no"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              placeholder="e.g. 4"
              inputMode="numeric"
              className="h-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-header" className="text-xs font-medium text-muted-foreground">
            School Header Image URL
          </Label>
          <Input
            id="ws-header"
            value={schoolHeaderImage}
            onChange={(e) => setSchoolHeaderImage(e.target.value)}
            placeholder="Paste image or Google Drive link"
            className="h-10"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] leading-snug text-muted-foreground">
              Google Drive share links are supported &amp; fetched server-side.
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
    </Card>
  );
}
