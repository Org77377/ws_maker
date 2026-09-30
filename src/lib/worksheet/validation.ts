// Validation engine for parsed worksheets.
//
// Type-aware rules:
//   - mcq:        needs ≥2 options, exactly 1 correct
//   - trueFalse:  needs exactly 2 options (True/False), exactly 1 correct
//   - fillBlank:  needs non-empty answer; no options required
//   - descriptive: needs question text; no options/correct answer required

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

    // Missing question text (applies to all types)
    if (!q.text.trim()) {
      qIssues.push({
        severity: "error",
        message: `Question ${q.number} is missing its question text.`,
        questionId: q.id,
        questionNumber: q.number,
      });
      qValid = false;
    }

    switch (q.type) {
      case "mcq":
        validateMcq(q, qIssues);
        break;
      case "trueFalse":
        validateTrueFalse(q, qIssues);
        break;
      case "fillBlank":
        validateFillBlank(q, qIssues);
        break;
      case "descriptive":
        validateDescriptive(q, qIssues);
        break;
    }

    // Re-check validity after type-specific validation
    if (qIssues.some((i) => i.severity === "error")) qValid = false;

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

function validateMcq(q: Question, issues: ValidationIssue[]): void {
  if (q.options.length === 0) {
    issues.push(err(q, `Question ${q.number} has no options.`));
    return;
  }
  if (q.options.length < 2) {
    issues.push(err(q, `Question ${q.number} has fewer than 2 options.`));
  }
  const seenLabels = new Set<string>();
  q.options.forEach((opt, i) => {
    if (!opt.label || !VALID_LABELS.includes(opt.label.toUpperCase())) {
      issues.push(
        err(
          q,
          `Question ${q.number} option #${i + 1} has an invalid label.`,
        ),
      );
    } else {
      if (seenLabels.has(opt.label.toUpperCase())) {
        issues.push(
          err(q, `Question ${q.number} has duplicate option ${opt.label}.`),
        );
      }
      seenLabels.add(opt.label.toUpperCase());
    }
    if (!opt.text.trim()) {
      issues.push(
        err(
          q,
          `Question ${q.number} is missing option ${opt.label || `#${i + 1}`}.`,
        ),
      );
    }
  });
  const correctCount = q.options.filter((o) => o.correct).length;
  if (correctCount === 0) {
    issues.push(err(q, `Question ${q.number} has no correct answer marked.`));
  } else if (correctCount > 1) {
    issues.push(
      err(q, `Question ${q.number} has ${correctCount} answers marked as correct.`),
    );
  }
}

function validateTrueFalse(q: Question, issues: ValidationIssue[]): void {
  if (q.options.length !== 2) {
    issues.push(
      err(q, `Question ${q.number} (True/False) must have exactly 2 options.`),
    );
  }
  const correctCount = q.options.filter((o) => o.correct).length;
  if (correctCount !== 1) {
    issues.push(
      err(q, `Question ${q.number} (True/False) must have exactly 1 correct answer.`),
    );
  }
}

function validateFillBlank(q: Question, issues: ValidationIssue[]): void {
  // Fill-in-blank needs a model answer (for answer key / marked mode)
  if (!q.answer.trim()) {
    issues.push(
      err(q, `Question ${q.number} (Fill in the blank) has no answer set.`),
    );
  }
}

function validateDescriptive(_q: Question, _issues: ValidationIssue[]): void {
  // Descriptive questions only need question text (checked above).
  // A model answer is optional but recommended — surfaced as a warning only
  // when answerMode would try to show it.
}

function err(q: Question, message: string): ValidationIssue {
  return {
    severity: "error",
    message,
    questionId: q.id,
    questionNumber: q.number,
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
