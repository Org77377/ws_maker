// Core data model for Worksheet Maker

export type AnswerMode = "none" | "marked" | "answerKey";

export interface WorksheetOption {
  label: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  number: number;
  text: string;
  options: WorksheetOption[];
}

export interface Worksheet {
  schoolHeaderImage: string;
  className: string;
  subject: string;
  chapterNumber: string;
  chapterName: string;
  answerMode: AnswerMode;
  questions: Question[];
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  /** question id the issue belongs to, if any */
  questionId?: string;
  /** question number for display, if any */
  questionNumber?: number;
}

export interface ValidationResult {
  validCount: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  totalOptions: number;
  hasBlockingErrors: boolean;
}

export const DEFAULT_HEADER_IMAGE =
  "https://drive.google.com/uc?export=view&id=1vY7OlaXvmZEXsAaOYWNCSzYoxoVjKQo2";

export const FALLBACK_HEADER_IMAGE =
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80";

export function createEmptyWorksheet(): Worksheet {
  return {
    schoolHeaderImage: DEFAULT_HEADER_IMAGE,
    className: "",
    subject: "",
    chapterNumber: "",
    chapterName: "",
    answerMode: "none",
    questions: [],
  };
}

export function createEmptyQuestion(number: number): Question {
  return {
    id: makeId(),
    number,
    text: "",
    options: [
      { label: "A", text: "", correct: false },
      { label: "B", text: "", correct: false },
      { label: "C", text: "", correct: false },
      { label: "D", text: "", correct: false },
    ],
  };
}

export function makeId(): string {
  // Lightweight unique id without external deps
  return (
    "q_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}
