// Robust multiple-choice question parser.
//
// Supported input formats (mixed allowed):
//   1. Question text
//   1) Question text
//   1 Question text
//
// Options:
//   A. Option text        A) Option text        A Option text
//
// Correct answer is marked with a trailing asterisk AFTER the option text:
//   A. Ctrl + A *
//
// The asterisk is stripped from the visible text and recorded as correct: true.

import { makeId, Question, WorksheetOption } from "./types";

const NUMBER_RE = /^\s*(\d{1,3})\s*[.)]?\s+/;
const OPTION_RE = /^\s*([A-Fa-f])\s*[.)]?\s+(.*)$/;

interface RawOption {
  label: string;
  text: string;
  correct: boolean;
}

interface RawQuestion {
  number: number | null;
  textLines: string[];
  options: RawOption[];
}

function cleanAsterisk(raw: string): { text: string; correct: boolean } {
  // Remove a trailing asterisk possibly surrounded by whitespace.
  // Only treat as correct marker if it is at the END of the option text.
  const trimmed = raw.trim();
  if (trimmed.endsWith("*")) {
    return {
      text: trimmed.slice(0, -1).trim(),
      correct: true,
    };
  }
  // Also support the form "A. *Ctrl + A" (leading asterisk) — less common but tolerated.
  if (trimmed.startsWith("*")) {
    return {
      text: trimmed.slice(1).trim(),
      correct: true,
    };
  }
  return { text: trimmed, correct: false };
}

function splitIntoBlocks(input: string): string[] {
  // Normalise line endings, drop empty-ish lines but keep structure.
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
      // blank line — only flush if the accumulated block already has content
      // and the next non-blank line starts a new question.
      flush();
    } else {
      current.push(line);
    }
  }
  flush();

  return blocks;
}

/**
 * Parse a single block that may contain one or more questions.
 * A block is a run of consecutive non-blank lines. Within a block, a new
 * question begins whenever a line matches the NUMBER_RE.
 */
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
      // Start a new question. (Option lines like "A. ..." never match NUMBER_RE
      // because they begin with a letter, so this is safe.)
      pushCurrent();
      current = {
        number: parseInt(numberMatch[1], 10),
        textLines: [line.slice(numberMatch[0].length).trim()],
        options: [],
      };
      continue;
    }

    if (optionMatch) {
      if (!current) {
        // Orphan option — create a placeholder question without number.
        current = { number: null, textLines: [], options: [] };
      }
      const { text, correct } = cleanAsterisk(optionMatch[2]);
      current.options.push({
        label: optionMatch[1].toUpperCase(),
        text,
        correct,
      });
      continue;
    }

    // Plain text line — append to current question text, or start one if none.
    if (!current) {
      // Try to detect a leading number without a separator (e.g. "1 Question text").
      const loose = line.match(/^\s*(\d{1,3})\s+(.*)$/);
      if (loose && !line.match(OPTION_RE)) {
        current = {
          number: parseInt(loose[1], 10),
          textLines: [loose[2].trim()],
          options: [],
        };
        continue;
      }
      current = { number: null, textLines: [line.trim()], options: [] };
    } else {
      // If the current question has no options yet, this is continuation of the
      // question text. If options already exist, treat as continuation of the
      // last option's text (multi-line option).
      if (current.options.length === 0) {
        current.textLines.push(line.trim());
      } else {
        const lastOpt = current.options[current.options.length - 1];
        const { text, correct } = cleanAsterisk(line.trim());
        // Append to the last option text, preserving its correct flag (OR).
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

  // Auto-assign numbers to questions that don't have one, based on order.
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
    return {
      id: makeId(),
      number,
      text,
      options,
    };
  });

  // Renumber sequentially in case of gaps/duplicates from raw input — the
  // editor displays the canonical sequential number. Original numbers are
  // used only to surface "duplicate question number" validation.
  return renumber(questions);
}

export function renumber(questions: Question[]): Question[] {
  return questions.map((q, idx) => ({ ...q, number: idx + 1 }));
}

export function reparsePreservingIds(
  input: string,
  previous: Question[],
): Question[] {
  // Re-parse and try to keep stable ids for unchanged questions by index.
  const fresh = parseQuestions(input);
  return fresh.map((q, idx) => ({
    ...q,
    id: previous[idx]?.id ?? q.id,
  }));
}
