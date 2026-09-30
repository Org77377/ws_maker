"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorksheetStore } from "@/hooks/use-worksheet";
import { Sparkles, Loader2, Wand2, Copy, Check } from "lucide-react";

interface AiQuestionGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiQuestionGenerator({
  open,
  onOpenChange,
}: AiQuestionGeneratorProps) {
  const { setRawInput, rawInput, className, subject } = useWorksheetStore();

  const [sourceText, setSourceText] = useState("");
  const [count, setCount] = useState("10");
  const [questionType, setQuestionType] = useState<
    "mixed" | "mcq" | "trueFalse" | "fillBlank" | "descriptive"
  >("mixed");
  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!sourceText.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          count: parseInt(count, 10) || 10,
          questionType,
          difficulty,
          grade: className,
          subject,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data.questions || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleUseResult = () => {
    // Append to existing rawInput (or replace if empty)
    const combined = rawInput.trim()
      ? `${rawInput.trim()}\n\n${result}`
      : result;
    setRawInput(combined);
    setResult("");
    setSourceText("");
    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplace = () => {
    setRawInput(result);
    setResult("");
    setSourceText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Wand2 className="h-5 w-5 text-accent" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Paste any text — chapter notes, a paragraph, or a topic — and the AI
            will auto-format it into properly structured questions ready to
            parse. No manual typing of options or formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source text */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Source text (paste chapter content, notes, or a topic)
            </Label>
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your text here. For example:&#10;&#10;A computer is an electronic device that processes data. It has input devices like keyboard and mouse, output devices like monitor and printer, and a CPU which is the brain of the computer..."
              className="min-h-[120px] resize-y text-sm"
              disabled={loading}
            />
          </div>

          {/* Options row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Count
              </Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} questions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Type
              </Label>
              <Select
                value={questionType}
                onValueChange={(v) =>
                  setQuestionType(v as typeof questionType)
                }
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed (all types)</SelectItem>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="trueFalse">True / False</SelectItem>
                  <SelectItem value="fillBlank">Fill in Blanks</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Level
              </Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as typeof difficulty)}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate button */}
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!sourceText.trim() || loading}
            className="h-11 w-full gap-2 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating questions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Questions
              </>
            )}
          </Button>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Generated questions (ready to parse)
                </Label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <Textarea
                value={result}
                readOnly
                className="min-h-[160px] resize-y font-mono text-[12px] leading-relaxed scroll-thin"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleUseResult}
                  className="h-10 flex-1 gap-1.5 text-sm"
                >
                  Append to questions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReplace}
                  className="h-10 flex-1 text-sm"
                >
                  Replace all
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
