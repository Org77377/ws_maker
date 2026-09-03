"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import type { AnswerMode } from "@/lib/worksheet/types";
import { Settings2, EyeOff, Asterisk, KeyRound } from "lucide-react";

const OPTIONS: {
  value: AnswerMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "none",
    label: "No Answer Key",
    description: "Remove all asterisks. Clean student version.",
    icon: <EyeOff className="h-4 w-4" />,
  },
  {
    value: "marked",
    label: "Mark Correct Answers",
    description: "Show * after the correct option.",
    icon: <Asterisk className="h-4 w-4" />,
  },
  {
    value: "answerKey",
    label: "Answer Key Only",
    description: "Hide marks, add an Answer Key at the end.",
    icon: <KeyRound className="h-4 w-4" />,
  },
];

export function SettingsPanel() {
  const { answerMode, setAnswerMode } = useWorksheetStore();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
          <Settings2 className="h-4 w-4 text-accent" />
          Answer Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={answerMode}
          onValueChange={(v) => setAnswerMode(v as AnswerMode)}
          className="grid gap-2"
        >
          {OPTIONS.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`mode-${opt.value}`}
              className={
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors " +
                (answerMode === opt.value
                  ? "border-accent bg-accent/5 ring-1 ring-accent/40"
                  : "border-border hover:bg-muted/50")
              }
            >
              <RadioGroupItem
                value={opt.value}
                id={`mode-${opt.value}`}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="text-accent">{opt.icon}</span>
                  {opt.label}
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {opt.description}
                </p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
