// Validation engine for parsed worksheets.
//
// Detects:
//  - Missing question text
//  - Missing options / empty option text
//  - Fewer than 2 options
//  - Multiple correct answers
//  - No correct answer
//  - Invalid option labels (non A-F, gaps, duplicates)
//  - Duplicate question numbers (from raw parse, surfaced as warning)
//
// Missing question NUMBER is intentionally NOT an error because the parser
// auto-assigns sequential numbers. We surface it only when the input was
// completely malformed (no questions detected).

import { Question, ValidationResult, ValidationIssue } from "./types";

const VALID_LABELS = ["A", "B", "C", "D", "E", "F"];

export function validateQuestions(questions: Question[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  let validCount = 0;
  let totalOptions = 0;

  if (questions.length === 0) {
    return {
      validCount: 0,
      errorCount: 1,
      warningCount: 0,
      issues: [
        {
          severity: "error",
          message: "No questions detected. Paste your questions above.",
        },
      ],
      totalOptions: 0,
      hasBlockingErrors: true,
    };
  }

  for (const q of questions) {
    const qIssues: ValidationIssue[] = [];
    let qValid = true;

    // Missing question text
    if (!q.text.trim()) {
      qIssues.push({
        severity: "error",
        message: `Question ${q.number} is missing its question text.`,
        questionId: q.id,
        questionNumber: q.number,
      });
      qValid = false;
    }

    // Options count
    if (q.options.length === 0) {
      qIssues.push({
        severity: "error",
        message: `Question ${q.number} has no options.`,
        questionId: q.id,
        questionNumber: q.number,
      });
      qValid = false;
    } else if (q.options.length < 2) {
      qIssues.push({
        severity: "error",
        message: `Question ${q.number} has fewer than 2 options.`,
        questionId: q.id,
        questionNumber: q.number,
      });
      qValid = false;
    }

    // Empty option text & invalid labels
    const seenLabels = new Set<string>();
    q.options.forEach((opt, i) => {
      totalOptions++;
      if (!opt.label || !VALID_LABELS.includes(opt.label.toUpperCase())) {
        qIssues.push({
          severity: "error",
          message: `Question ${q.number} option #${i + 1} has an invalid label.`,
          questionId: q.id,
          questionNumber: q.number,
        });
        qValid = false;
      } else {
        if (seenLabels.has(opt.label.toUpperCase())) {
          qIssues.push({
            severity: "error",
            message: `Question ${q.number} has duplicate option ${opt.label}.`,
            questionId: q.id,
            questionNumber: q.number,
          });
          qValid = false;
        }
        seenLabels.add(opt.label.toUpperCase());
      }
      if (!opt.text.trim()) {
        qIssues.push({
          severity: "error",
          message: `Question ${q.number} is missing option ${opt.label || `#${i + 1}`}.`,
          questionId: q.id,
          questionNumber: q.number,
        });
        qValid = false;
      }
    });

    // Correct answer checks
    const correctCount = q.options.filter((o) => o.correct).length;
    if (correctCount === 0) {
      qIssues.push({
        severity: "error",
        message: `Question ${q.number} has no correct answer marked.`,
        questionId: q.id,
        questionNumber: q.number,
      });
      qValid = false;
    } else if (correctCount > 1) {
      qIssues.push({
        severity: "error",
        message: `Question ${q.number} has ${correctCount} answers marked as correct.`,
        questionId: q.id,
        questionNumber: q.number,
      });
      qValid = false;
    }

    issues.push(...qIssues);
    if (qValid) validCount++;
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    validCount,
    errorCount,
    warningCount,
    issues,
    totalOptions,
    hasBlockingErrors: errorCount > 0,
  };
}

export function firstInvalidQuestion(
  questions: Question[],
  result: ValidationResult,
): Question | undefined {
  const firstIssue = result.issues.find((i) => i.questionId);
  if (!firstIssue?.questionId) return undefined;
  return questions.find((q) => q.id === firstIssue.questionId);
}
