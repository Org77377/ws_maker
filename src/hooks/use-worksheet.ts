"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AnswerMode,
  createDefaultExamMeta,
  createEmptyQuestion,
  createTypedQuestion,
  DEFAULT_HEADER_IMAGE,
  DocumentMode,
  ExamMeta,
  makeId,
  makeSectionId,
  Question,
  QuestionType,
  Section,
  Worksheet,
} from "@/lib/worksheet/types";
import { parseQuestions, renumber } from "@/lib/worksheet/parser";

interface WorksheetState {
  // Document mode
  mode: DocumentMode;
  // Raw pasted text
  rawInput: string;
  // Parsed + editable questions
  questions: Question[];
  // Worksheet details
  className: string;
  subject: string;
  chapterNumber: string;
  chapterName: string;
  section: string;
  rollNo: string;
  schoolHeaderImage: string;
  answerMode: AnswerMode;
  worksheetHeading: string;
  // Section groupings
  sections: Section[];
  // Exam metadata
  examMeta: ExamMeta;
  // UI state
  hasParsed: boolean;
  isGenerating: boolean;
  lastFocusedQuestionId: string | null;

  // Actions — mode + meta
  setMode: (m: DocumentMode) => void;
  setWorksheetHeading: (v: string) => void;
  setExamMeta: (patch: Partial<ExamMeta>) => void;
  updateExamInstruction: (index: number, value: string) => void;
  addExamInstruction: () => void;
  removeExamInstruction: (index: number) => void;

  // Actions — sections
  addSection: (title?: string) => string;
  updateSection: (id: string, patch: Partial<Section>) => void;
  deleteSection: (id: string) => void;
  assignQuestionToSection: (qId: string, sectionId: string | null) => void;

  // Actions — input
  setRawInput: (input: string) => void;
  parseInput: () => void;
  setClassName: (v: string) => void;
  setSubject: (v: string) => void;
  setChapterNumber: (v: string) => void;
  setChapterName: (v: string) => void;
  setSection: (v: string) => void;
  setRollNo: (v: string) => void;
  setSchoolHeaderImage: (v: string) => void;
  setAnswerMode: (m: AnswerMode) => void;

  // Actions — question editing
  updateQuestionText: (id: string, text: string) => void;
  setQuestionType: (id: string, type: QuestionType) => void;
  updateQuestionAnswer: (id: string, answer: string) => void;
  updateQuestionMarks: (id: string, marks: number) => void;
  updateOptionText: (qId: string, optLabel: string, text: string) => void;
  setCorrectOption: (qId: string, optLabel: string) => void;
  addOption: (qId: string) => void;
  removeOption: (qId: string, optLabel: string) => void;
  addQuestion: (type?: QuestionType) => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  moveQuestion: (id: string, direction: "up" | "down") => void;
  reorderQuestions: (orderedIds: string[]) => void;
  setLastFocusedQuestionId: (id: string | null) => void;

  setGenerating: (v: boolean) => void;
  loadSample: () => void;
  loadExamSample: () => void;
  reset: () => void;

  getWorksheet: () => Worksheet;
}

const SAMPLE_INPUT = `M1. Which shortcut is used to select the entire worksheet?
A. Ctrl + A *
B. Ctrl + C
C. Ctrl + X
D. Ctrl + V

M2. To select an entire row or column, you should click its:
A. Formula bar
B. Row/column heading *
C. Status bar
D. Name Box

T3. A formula in a cell always begins with the equals sign.

F4. The small black square at the bottom-right corner of a cell is called the ___ ~ fill handle

D5. Explain the difference between relative and absolute cell references with an example.
`;

const DEFAULTS = {
  mode: "worksheet" as DocumentMode,
  rawInput: "",
  questions: [] as Question[],
  className: "",
  subject: "",
  chapterNumber: "",
  chapterName: "",
  section: "",
  rollNo: "",
  schoolHeaderImage: DEFAULT_HEADER_IMAGE,
  answerMode: "none" as AnswerMode,
  worksheetHeading: "",
  sections: [] as Section[],
  examMeta: createDefaultExamMeta(),
  hasParsed: false,
  isGenerating: false,
  lastFocusedQuestionId: null as string | null,
};

export const useWorksheetStore = create<WorksheetState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      // ---- Mode + meta ----
      setMode: (m) => set({ mode: m }),

      setWorksheetHeading: (v) => set({ worksheetHeading: v }),

      setExamMeta: (patch) =>
        set((s) => ({ examMeta: { ...s.examMeta, ...patch } })),

      updateExamInstruction: (index, value) =>
        set((s) => ({
          examMeta: {
            ...s.examMeta,
            instructions: s.examMeta.instructions.map((ins, i) =>
              i === index ? value : ins,
            ),
          },
        })),

      addExamInstruction: () =>
        set((s) => ({
          examMeta: {
            ...s.examMeta,
            instructions: [...s.examMeta.instructions, ""],
          },
        })),

      removeExamInstruction: (index) =>
        set((s) => ({
          examMeta: {
            ...s.examMeta,
            instructions: s.examMeta.instructions.filter((_, i) => i !== index),
          },
        })),

      // ---- Sections ----
      addSection: (title = "Section A") => {
        const id = makeSectionId();
        set((s) => ({
          sections: [
            ...s.sections,
            {
              id,
              title,
              questionIds: [],
              instruction: "Answer the following",
              marks: "20",
              perQuestionMarks: "0.5",
              attemptCount: "5",
              questionCount: "40",
            },
          ],
        }));
        return id;
      },

      updateSection: (id, patch) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, ...patch } : sec,
          ),
        })),

      deleteSection: (id) =>
        set((s) => ({
          sections: s.sections.filter((sec) => sec.id !== id),
        })),

      assignQuestionToSection: (qId, sectionId) =>
        set((s) => ({
          sections: s.sections.map((sec) => {
            // Remove from all sections first
            const filtered = sec.questionIds.filter((qid) => qid !== qId);
            // Add to the target section (if not null)
            if (sec.id === sectionId) {
              return { ...sec, questionIds: [...filtered, qId] };
            }
            return { ...sec, questionIds: filtered };
          }),
        })),

      // ---- Input ----
      setRawInput: (input) => set({ rawInput: input }),

      parseInput: () => {
        const questions = parseQuestions(get().rawInput);
        set({ questions, hasParsed: true });
      },

      setClassName: (v) => set({ className: v }),
      setSubject: (v) => set({ subject: v }),
      setChapterNumber: (v) => set({ chapterNumber: v }),
      setChapterName: (v) => set({ chapterName: v }),
      setSection: (v) => set({ section: v }),
      setRollNo: (v) => set({ rollNo: v }),
      setSchoolHeaderImage: (v) => set({ schoolHeaderImage: v }),
      setAnswerMode: (m) => set({ answerMode: m }),

      // ---- Question editing ----
      updateQuestionText: (id, text) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === id ? { ...q, text } : q,
          ),
        })),

      setQuestionType: (id, type) =>
        set((s) => ({
          questions: s.questions.map((q) => {
            if (q.id !== id) return q;
            // When switching types, give appropriate defaults
            const updated = createTypedQuestion(q.number, type);
            return {
              ...q,
              type,
              options: updated.options,
              answer: q.type === type ? q.answer : "",
            };
          }),
        })),

      updateQuestionAnswer: (id, answer) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === id ? { ...q, answer } : q,
          ),
        })),

      updateQuestionMarks: (id, marks) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === id ? { ...q, marks } : q,
          ),
        })),

      updateOptionText: (qId, optLabel, text) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === qId
              ? {
                  ...q,
                  options: q.options.map((o) =>
                    o.label === optLabel ? { ...o, text } : o,
                  ),
                }
              : q,
          ),
        })),

      setCorrectOption: (qId, optLabel) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === qId
              ? {
                  ...q,
                  options: q.options.map((o) => ({
                    ...o,
                    correct: o.label === optLabel,
                  })),
                }
              : q,
          ),
        })),

      addOption: (qId) =>
        set((s) => ({
          questions: s.questions.map((q) => {
            if (q.id !== qId) return q;
            const labels = ["A", "B", "C", "D", "E", "F"];
            const nextLabel =
              labels.find((l) => !q.options.some((o) => o.label === l)) ?? "E";
            return {
              ...q,
              options: [
                ...q.options,
                { label: nextLabel, text: "", correct: false },
              ],
            };
          }),
        })),

      removeOption: (qId, optLabel) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === qId
              ? {
                  ...q,
                  options: q.options
                    .filter((o) => o.label !== optLabel)
                    .map((o, i) => ({
                      ...o,
                      label: String.fromCharCode(65 + i),
                    })),
                }
              : q,
          ),
        })),

      addQuestion: (type) =>
        set((s) => {
          const qType: QuestionType = type ?? "mcq";
          const newQ = createTypedQuestion(s.questions.length + 1, qType);
          return { questions: [...s.questions, newQ] };
        }),

      deleteQuestion: (id) =>
        set((s) => ({
          questions: renumber(s.questions.filter((q) => q.id !== id)),
          // Also remove from any section
          sections: s.sections.map((sec) => ({
            ...sec,
            questionIds: sec.questionIds.filter((qid) => qid !== id),
          })),
        })),

      duplicateQuestion: (id) =>
        set((s) => {
          const idx = s.questions.findIndex((q) => q.id === id);
          if (idx === -1) return {};
          const original = s.questions[idx];
          const copy: Question = {
            ...original,
            id: makeId(),
            options: original.options.map((o) => ({ ...o })),
          };
          const next = [...s.questions];
          next.splice(idx + 1, 0, copy);
          return { questions: renumber(next) };
        }),

      moveQuestion: (id, direction) =>
        set((s) => {
          const idx = s.questions.findIndex((q) => q.id === id);
          if (idx === -1) return {};
          const target = direction === "up" ? idx - 1 : idx + 1;
          if (target < 0 || target >= s.questions.length) return {};
          const next = [...s.questions];
          [next[idx], next[target]] = [next[target], next[idx]];
          return { questions: renumber(next) };
        }),

      reorderQuestions: (orderedIds) =>
        set((s) => {
          const map = new Map(s.questions.map((q) => [q.id, q]));
          const next: Question[] = [];
          for (const id of orderedIds) {
            const q = map.get(id);
            if (q) next.push(q);
          }
          for (const q of s.questions) {
            if (!orderedIds.includes(q.id)) next.push(q);
          }
          return { questions: renumber(next) };
        }),

      setLastFocusedQuestionId: (id) => set({ lastFocusedQuestionId: id }),

      setGenerating: (v) => set({ isGenerating: v }),

      loadSample: () =>
        set({
          mode: "worksheet",
          rawInput: SAMPLE_INPUT,
          className: "VII",
          subject: "Computer Science",
          chapterNumber: "4",
          chapterName: "Introduction to Krita",
          section: "",
          rollNo: "",
          answerMode: "none",
          worksheetHeading: "",
          sections: [],
        }),

      loadExamSample: () =>
        set((s) => ({
          mode: "exam",
          rawInput: `M1. Which of the following is NOT an input device?
A. Keyboard
B. Mouse
C. Monitor *
D. Scanner

T2. The CPU is the brain of the computer.

F3. The shortcut to copy is Ctrl + ___ ~ C

D4. What is an operating system? Name any two operating systems.

D5. Explain the difference between hardware and software with examples.
`,
          questions: [],
          examMeta: {
            ...s.examMeta,
            examTitle: "Mid-Term Examination",
            grade: "8",
            subject: s.subject || "Computer Science",
            maxMarks: "80",
            duration: "3 Hours",
            date: "",
            footerYear: "2026-27",
            footerTerm: "MT",
            instructions: [
              "The question paper is divided into five sections – A, B, C, D and E.",
              "All questions are compulsory.",
              "Read the questions carefully before answering.",
              "Follow the instructions given in each section.",
              "Write the correct question number for each answer.",
              "Write your answers neatly and clearly.",
              "Check your answers before submitting the paper.",
            ],
          },
          sections: [
            { id: makeSectionId(), title: "Section A", instruction: "Answer the following (any 5)", marks: "20", perQuestionMarks: "0.5", attemptCount: "5", questionCount: "40", questionIds: [] },
            { id: makeSectionId(), title: "Section B", instruction: "Answer the following (any 4)", marks: "20", perQuestionMarks: "2", attemptCount: "4", questionCount: "10", questionIds: [] },
            { id: makeSectionId(), title: "Section C", instruction: "Answer the following (any 3)", marks: "20", perQuestionMarks: "3", attemptCount: "3", questionCount: "6", questionIds: [] },
            { id: makeSectionId(), title: "Section D", instruction: "Answer the following (any 2)", marks: "20", perQuestionMarks: "5", attemptCount: "2", questionCount: "4", questionIds: [] },
          ],
        })),

      reset: () => set({ ...DEFAULTS }),

      getWorksheet: () => {
        const s = get();
        return {
          mode: s.mode,
          schoolHeaderImage: s.schoolHeaderImage,
          className: s.className,
          subject: s.subject,
          chapterNumber: s.chapterNumber,
          chapterName: s.chapterName,
          section: s.section,
          rollNo: s.rollNo,
          answerMode: s.answerMode,
          worksheetHeading: s.worksheetHeading,
          questions: s.questions,
          sections: s.sections,
          examMeta: s.examMeta,
        };
      },
    }),
    {
      name: "worksheet-maker-v2",
      // Migrate old v1 state: add type/answer/marks to legacy questions
      migrate: (persisted: unknown) => {
        const s = persisted as Record<string, unknown>;
        if (!s) return s as never;
        // Ensure new fields exist
        if (s.mode === undefined) s.mode = "worksheet";
        if (s.worksheetHeading === undefined) s.worksheetHeading = "";
        if (!Array.isArray(s.sections)) s.sections = [];
        // Migrate sections: add new fields if missing
        if (Array.isArray(s.sections)) {
          s.sections = (s.sections as Section[]).map((sec) => ({
            instruction: sec.instruction ?? "Answer the following",
            marks: sec.marks ?? "",
            perQuestionMarks: sec.perQuestionMarks ?? "",
            attemptCount: sec.attemptCount ?? "",
            questionCount: sec.questionCount ?? "",
            ...sec,
          }));
        }
        if (!s.examMeta) s.examMeta = createDefaultExamMeta();
        else {
          const em = s.examMeta as Record<string, unknown>;
          if (em.footerYear === undefined) em.footerYear = "2026-27";
          if (em.footerTerm === undefined) em.footerTerm = "MT";
        }
        // Migrate questions: add type/answer/marks if missing
        if (Array.isArray(s.questions)) {
          s.questions = (s.questions as Question[]).map((q) => ({
            ...q,
            type: (q as { type?: QuestionType }).type ?? "mcq",
            answer: (q as { answer?: string }).answer ?? "",
            marks: (q as { marks?: number }).marks ?? 1,
          }));
        }
        return s as never;
      },
      version: 3,
      partialize: (s) => ({
        mode: s.mode,
        rawInput: s.rawInput,
        questions: s.questions,
        className: s.className,
        subject: s.subject,
        chapterNumber: s.chapterNumber,
        chapterName: s.chapterName,
        section: s.section,
        rollNo: s.rollNo,
        schoolHeaderImage: s.schoolHeaderImage,
        answerMode: s.answerMode,
        worksheetHeading: s.worksheetHeading,
        sections: s.sections,
        examMeta: s.examMeta,
        hasParsed: s.hasParsed,
      }),
    },
  ),
);
