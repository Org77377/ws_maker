// Core data model for Worksheet Maker
//
// Supports two document modes:
//   - "worksheet": the original MCQ worksheet (with optional descriptive /
//     fill-in-blank / true-false questions and configurable sections)
//   - "exam": a CBSE-style Mid-Term Examination paper with a distinct layout
//     (centered title, Grade/Subject/Marks/Time/Date meta rows, general
//     instructions box, sections A–E with per-question marks, footer)

export type AnswerMode = "none" | "marked" | "answerKey";

export type QuestionType = "mcq" | "descriptive" | "fillBlank" | "trueFalse";

export type DocumentMode = "worksheet" | "exam";

export interface WorksheetOption {
  label: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  number: number;
  type: QuestionType;
  text: string;
  options: WorksheetOption[]; // MCQ + trueFalse
  /** Model answer for fill-in-the-blank and descriptive questions. */
  answer: string;
  /** Marks awarded (used in exam mode; informational in worksheet mode). */
  marks: number;
}

export interface Section {
  id: string;
  title: string;
  /** Ordered list of question ids that belong to this section. */
  questionIds: string[];
  /** Instruction shown after the title, e.g. "Answer the following (any 5)". */
  instruction: string;
  /** Total marks for this section (shown on the right, e.g. "20"). */
  marks: string;
  /** Per-question marks multiplier, e.g. "0.5" → renders "40 x 0.5 = 20". */
  perQuestionMarks: string;
  /** Number of questions to attempt, e.g. "5" → "any 5". */
  attemptCount: string;
  /** Total number of questions in the section, e.g. "40". */
  questionCount: string;
}

export interface ExamMeta {
  examTitle: string; // e.g. "Mid-Term Examination"
  grade: string; // e.g. "8"
  subject: string; // e.g. "Computer Science"
  maxMarks: string; // e.g. "80"
  duration: string; // e.g. "3 Hours"
  date: string; // e.g. "05/10/2026"
  /** General instruction lines shown in the instructions box. */
  instructions: string[];
  /** Footer code components — rendered as SPS_<year>_<term>_<grade>_QP_<subject>. */
  footerYear: string; // e.g. "2026-27"
  footerTerm: string; // e.g. "MT" (Mid-Term)
}

export interface Worksheet {
  mode: DocumentMode;
  schoolHeaderImage: string;
  className: string;
  subject: string;
  chapterNumber: string;
  chapterName: string;
  section: string;
  rollNo: string;
  answerMode: AnswerMode;
  /** Configurable heading shown above the questions (worksheet mode).
   *  Defaults to "MCQs – Chapter <n>" when empty. */
  worksheetHeading: string;
  questions: Question[];
  /** Section groupings (both modes). Questions not in any section still render
   *  in the main flow. */
  sections: Section[];
  /** Exam-mode metadata. Ignored in worksheet mode. */
  examMeta: ExamMeta;
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

export const DEFAULT_EXAM_INSTRUCTIONS = [
  "The question paper is divided into five sections – A, B, C, D and E.",
  "All questions are compulsory.",
  "Read the questions carefully before answering.",
  "Follow the instructions given in each section.",
  "Write the correct question number for each answer.",
  "Write your answers neatly and clearly.",
  "Check your answers before submitting the paper.",
];

export function createEmptyWorksheet(): Worksheet {
  return {
    mode: "worksheet",
    schoolHeaderImage: DEFAULT_HEADER_IMAGE,
    className: "",
    subject: "",
    chapterNumber: "",
    chapterName: "",
    section: "",
    rollNo: "",
    answerMode: "none",
    worksheetHeading: "",
    questions: [],
    sections: [],
    examMeta: createDefaultExamMeta(),
  };
}

export function createDefaultExamMeta(): ExamMeta {
  return {
    examTitle: "Mid-Term Examination",
    grade: "",
    subject: "",
    maxMarks: "80",
    duration: "3 Hours",
    date: "",
    instructions: [...DEFAULT_EXAM_INSTRUCTIONS],
    footerYear: "2026-27",
    footerTerm: "MT",
  };
}

export function createEmptyQuestion(number: number): Question {
  return {
    id: makeId(),
    number,
    type: "mcq",
    text: "",
    options: [
      { label: "A", text: "", correct: false },
      { label: "B", text: "", correct: false },
      { label: "C", text: "", correct: false },
      { label: "D", text: "", correct: false },
    ],
    answer: "",
    marks: 1,
  };
}

/** Create a question of a specific type with appropriate defaults. */
export function createTypedQuestion(
  number: number,
  type: QuestionType,
): Question {
  const base = createEmptyQuestion(number);
  switch (type) {
    case "mcq":
      return { ...base, type, marks: 1 };
    case "descriptive":
      return { ...base, type, marks: 1, options: [] };
    case "fillBlank":
      return { ...base, type, marks: 1, options: [] };
    case "trueFalse":
      return {
        ...base,
        type,
        marks: 1,
        options: [
          { label: "A", text: "True", correct: false },
          { label: "B", text: "False", correct: false },
        ],
      };
    default:
      return base;
  }
}

export function makeId(): string {
  return (
    "q_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function makeSectionId(): string {
  return (
    "s_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 6)
  );
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  descriptive: "Descriptive",
  fillBlank: "Fill in the Blanks",
  trueFalse: "True / False",
};

export const QUESTION_TYPE_SHORT: Record<QuestionType, string> = {
  mcq: "MCQ",
  descriptive: "DESC",
  fillBlank: "FILL",
  trueFalse: "T/F",
};
