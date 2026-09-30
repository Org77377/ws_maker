// Robust multiple-choice question parser.
//
// Supports four question types via optional type prefixes in the question
// number line:
//   M1. / M1) / M1    → MCQ (default when no prefix)
//   D1. / D1) / D1    → Descriptive
//   F1. / F1) / F1    → Fill in the blanks
//   T1. / T1) / T1    → True / False
//
// If no prefix is given, the question is treated as an MCQ (backward
// compatible with the original format).
//
// Options follow the question:
//   A. Option text        A) Option text        A Option text
//
// Correct answer is marked with a trailing asterisk AFTER the option text:
//   A. Ctrl + A *
//
// For fill-in-the-blank questions, the correct answer can follow a `~` or
// `=>` marker on the question line:
//   F1. The sky is ___ ~ blue
//   F1. The sky is ___ => blue

import { makeId, Question, QuestionType, WorksheetOption } from "./types";

const NUMBER_RE = /^\s*([MDFTmdft]?)(\d{1,3})\s*[.)]?\s+/;
const OPTION_RE = /^\s*([A-Fa-f])\s*[.)]?\s+(.*)$/;
const FILL_ANSWER_RE = /[~=>]+\s*(.+)$/;

interface RawOption {
  label: string;
  text: string;
  correct: boolean;
}

interface RawQuestion {
  number: number | null;
  type: QuestionType;
  textLines: string[];
  options: RawOption[];
  /** Extracted answer for fill-in-blank / descriptive. */
  answer: string;
}

function cleanAsterisk(raw: string): { text: string; correct: boolean } {
  const trimmed = raw.trim();
  if (trimmed.endsWith("*")) {
    return { text: trimmed.slice(0, -1).trim(), correct: true };
  }
  if (trimmed.startsWith("*")) {
    return { text: trimmed.slice(1).trim(), correct: true };
  }
  return { text: trimmed, correct: false };
}

/** Parse a fill-in-the-blank answer marker (`~ answer` or `=> answer`). */
function extractFillAnswer(line: string): { text: string; answer: string } {
  const m = line.match(FILL_ANSWER_RE);
  if (m) {
    return { text: line.slice(0, m.index).trim(), answer: m[1].trim() };
  }
  return { text: line.trim(), answer: "" };
}

function splitIntoBlocks(input: string): string[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) {
      const text = current.join("\n").trim();
      if (text) blocks.push(text);
      current = [];
    }
  };
  for (const line of lines) {
    if (line.trim() === "") {
      flush();
    } else {
      current.push(line);
    }
  }
  flush();
  return blocks;
}

function parseTypePrefix(letter: string): QuestionType {
  const l = letter.toUpperCase();
  if (l === "D") return "descriptive";
  if (l === "F") return "fillBlank";
  if (l === "T") return "trueFalse";
  return "mcq";
}

function parseBlock(block: string): RawQuestion[] {
  const lines = block.split("\n");
  const questions: RawQuestion[] = [];
  let current: RawQuestion | null = null;

  const pushCurrent = () => {
    if (current) questions.push(current);
    current = null;
  };

  for (const line of lines) {
    const numberMatch = line.match(NUMBER_RE);
    const optionMatch = line.match(OPTION_RE);

    if (numberMatch && !optionMatch) {
      pushCurrent();
      const typePrefix = numberMatch[1];
      const type = parseTypePrefix(typePrefix);
      let questionText = line.slice(numberMatch[0].length).trim();
      let answer = "";
      // For fill-in-the-blank, extract the "~ answer" or "=> answer" marker
      // from the question line itself (it may be on the same line).
      if (type === "fillBlank") {
        const extracted = extractFillAnswer(questionText);
        questionText = extracted.text;
        answer = extracted.answer;
      }
      current = {
        number: parseInt(numberMatch[2], 10),
        type,
        textLines: [questionText],
        options: [],
        answer,
      };
      continue;
    }

    if (optionMatch) {
      if (!current) {
        current = { number: null, type: "mcq", textLines: [], options: [], answer: "" };
      }
      const { text, correct } = cleanAsterisk(optionMatch[2]);
      current.options.push({
        label: optionMatch[1].toUpperCase(),
        text,
        correct,
      });
      continue;
    }

    if (!current) {
      const loose = line.match(/^\s*(\d{1,3})\s+(.*)$/);
      if (loose && !line.match(OPTION_RE)) {
        current = {
          number: parseInt(loose[1], 10),
          type: "mcq",
          textLines: [loose[2].trim()],
          options: [],
          answer: "",
        };
        continue;
      }
      current = { number: null, type: "mcq", textLines: [line.trim()], options: [], answer: "" };
    } else {
      if (current.options.length === 0) {
        // Continuation of question text — for fill-blank, extract the answer
        if (current.type === "fillBlank") {
          const { text, answer } = extractFillAnswer(line);
          if (answer) current.answer = answer;
          current.textLines.push(text);
        } else {
          current.textLines.push(line.trim());
        }
      } else {
        const lastOpt = current.options[current.options.length - 1];
        const { text, correct } = cleanAsterisk(line.trim());
        lastOpt.text = `${lastOpt.text} ${text}`.trim();
        if (correct) lastOpt.correct = true;
      }
    }
  }
  pushCurrent();
  return questions;
}

export function parseQuestions(input: string): Question[] {
  if (!input || !input.trim()) return [];

  const blocks = splitIntoBlocks(input);
  const raw: RawQuestion[] = [];
  for (const block of blocks) {
    raw.push(...parseBlock(block));
  }

  let nextAuto = 1;
  const questions: Question[] = raw.map((rq) => {
    const number = rq.number ?? nextAuto;
    nextAuto = number + 1;
    const text = rq.textLines.join(" ").replace(/\s+/g, " ").trim();
    const options: WorksheetOption[] = rq.options.map((o) => ({
      label: o.label,
      text: o.text,
      correct: o.correct,
    }));

    // For true/false questions with no options parsed, add default T/F
    let finalOptions = options;
    if (rq.type === "trueFalse" && options.length === 0) {
      finalOptions = [
        { label: "A", text: "True", correct: false },
        { label: "B", text: "False", correct: false },
      ];
    }

    return {
      id: makeId(),
      number,
      type: rq.type,
      text,
      options: finalOptions,
      answer: rq.answer,
      marks: rq.type === "descriptive" ? 5 : 1,
    };
  });

  return renumber(questions);
}

export function renumber(questions: Question[]): Question[] {
  return questions.map((q, idx) => ({ ...q, number: idx + 1 }));
}

export function reparsePreservingIds(
  input: string,
  previous: Question[],
): Question[] {
  const fresh = parseQuestions(input);
  return fresh.map((q, idx) => ({
    ...q,
    id: previous[idx]?.id ?? q.id,
  }));
}
