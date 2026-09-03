"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AnswerMode,
  createEmptyQuestion,
  DEFAULT_HEADER_IMAGE,
  makeId,
  Question,
  Worksheet,
  WorksheetOption,
} from "@/lib/worksheet/types";
import { parseQuestions, renumber } from "@/lib/worksheet/parser";

interface WorksheetState {
  // Raw pasted text
  rawInput: string;
  // Parsed + editable questions
  questions: Question[];
  // Worksheet details
  className: string;
  subject: string;
  chapterNumber: string;
  chapterName: string;
  schoolHeaderImage: string;
  answerMode: AnswerMode;
  // UI state
  hasParsed: boolean;
  isGenerating: boolean;
  lastFocusedQuestionId: string | null;

  // Actions
  setRawInput: (input: string) => void;
  parseInput: () => void;
  setClassName: (v: string) => void;
  setSubject: (v: string) => void;
  setChapterNumber: (v: string) => void;
  setChapterName: (v: string) => void;
  setSchoolHeaderImage: (v: string) => void;
  setAnswerMode: (m: AnswerMode) => void;

  updateQuestionText: (id: string, text: string) => void;
  updateOptionText: (qId: string, optLabel: string, text: string) => void;
  setCorrectOption: (qId: string, optLabel: string) => void;
  addOption: (qId: string) => void;
  removeOption: (qId: string, optLabel: string) => void;
  addQuestion: () => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  moveQuestion: (id: string, direction: "up" | "down") => void;
  reorderQuestions: (orderedIds: string[]) => void;
  setLastFocusedQuestionId: (id: string | null) => void;

  setGenerating: (v: boolean) => void;
  loadSample: () => void;
  reset: () => void;

  getWorksheet: () => Worksheet;
}

const SAMPLE_INPUT = `1. Which shortcut is used to select the entire worksheet?
A. Ctrl + A *
B. Ctrl + C
C. Ctrl + X
D. Ctrl + V

2. To select an entire row or column, you should click its:
A. Formula bar
B. Row/column heading *
C. Status bar
D. Name Box

3. The small black square at the bottom-right corner of a selected cell is called the:
A. Selection handle
B. Fill handle *
C. Drag marker
D. Copy point

4. Which function adds all numbers in a range of cells?
A. AVERAGE
B. COUNT
C. SUM *
D. MAX

5. A formula in a cell always begins with which symbol?
A. Plus sign
B. Equals sign *
C. Asterisk
D. Hash symbol
`;

const DEFAULTS = {
  rawInput: "",
  questions: [] as Question[],
  className: "",
  subject: "",
  chapterNumber: "",
  chapterName: "",
  schoolHeaderImage: DEFAULT_HEADER_IMAGE,
  answerMode: "none" as AnswerMode,
  hasParsed: false,
  isGenerating: false,
  lastFocusedQuestionId: null as string | null,
};

export const useWorksheetStore = create<WorksheetState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setRawInput: (input) => set({ rawInput: input }),

      parseInput: () => {
        const questions = parseQuestions(get().rawInput);
        set({ questions, hasParsed: true });
      },

      setClassName: (v) => set({ className: v }),
      setSubject: (v) => set({ subject: v }),
      setChapterNumber: (v) => set({ chapterNumber: v }),
      setChapterName: (v) => set({ chapterName: v }),
      setSchoolHeaderImage: (v) => set({ schoolHeaderImage: v }),
      setAnswerMode: (m) => set({ answerMode: m }),

      updateQuestionText: (id, text) =>
        set((s) => ({
          questions: s.questions.map((q) =>
            q.id === id ? { ...q, text } : q,
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

      addQuestion: () =>
        set((s) => {
          const newQ = createEmptyQuestion(s.questions.length + 1);
          return { questions: [...s.questions, newQ] };
        }),

      deleteQuestion: (id) =>
        set((s) => ({
          questions: renumber(s.questions.filter((q) => q.id !== id)),
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
          // Append any not included (safety)
          for (const q of s.questions) {
            if (!orderedIds.includes(q.id)) next.push(q);
          }
          return { questions: renumber(next) };
        }),

      setLastFocusedQuestionId: (id) => set({ lastFocusedQuestionId: id }),

      setGenerating: (v) => set({ isGenerating: v }),

      loadSample: () =>
        set({
          rawInput: SAMPLE_INPUT,
          className: "VII",
          subject: "Computer",
          chapterNumber: "4",
          chapterName: "Introduction to Krita",
          answerMode: "none",
        }),

      reset: () =>
        set({
          ...DEFAULTS,
          // keep schoolHeaderImage default handled by component fallback
        }),

      getWorksheet: () => {
        const s = get();
        return {
          schoolHeaderImage: s.schoolHeaderImage,
          className: s.className,
          subject: s.subject,
          chapterNumber: s.chapterNumber,
          chapterName: s.chapterName,
          answerMode: s.answerMode,
          questions: s.questions,
        };
      },
    }),
    {
      name: "worksheet-maker-v1",
      // Only persist data, not transient UI flags
      partialize: (s) => ({
        rawInput: s.rawInput,
        questions: s.questions,
        className: s.className,
        subject: s.subject,
        chapterNumber: s.chapterNumber,
        chapterName: s.chapterName,
        schoolHeaderImage: s.schoolHeaderImage,
        answerMode: s.answerMode,
        hasParsed: s.hasParsed,
      }),
    },
  ),
);
