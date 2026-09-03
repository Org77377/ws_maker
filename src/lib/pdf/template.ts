// HTML template generator for the A4 worksheet PDF.
//
// Produces a self-contained HTML document styled for A4 portrait printing via
// Playwright. Key requirements honoured here:
//   - A4 portrait, fixed print margins (top 15mm, bottom 15mm, left/right 16mm)
//   - School header image + worksheet info block appear ONLY on page 1
//   - Each question stays together (break-inside: avoid)
//   - Options stay with their question
//   - Answer Key appended when answerMode === "answerKey"
//   - Marked mode shows a trailing asterisk on the correct option
//
// The header image is expected to be a data URL or a directly reachable URL
// (the API route normalises Google Drive links + fetches/encodes when needed).

import { AnswerMode, Question, Worksheet } from "../worksheet/types";

export interface PdfTemplateInput {
  worksheet: Worksheet;
  /** Resolved header image (data URL or reachable URL). */
  headerImage?: string;
  /** When true, the banner image's built-in bottom rule is hidden via CSS
   *  clip-path (used by the live preview, which embeds the raw image URL).
   *  The PDF path trims the line server-side instead, so this is false there. */
  previewMode?: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optionLine(
  opt: { label: string; text: string; correct: boolean },
  mode: AnswerMode,
): string {
  const marker = mode === "marked" && opt.correct ? " *" : "";
  return `
        <div class="opt">
          <span class="opt-label">${escapeHtml(opt.label)}.</span>
          <span class="opt-text">${escapeHtml(opt.text)}${marker}</span>
        </div>`;
}

function questionBlock(q: Question, mode: AnswerMode): string {
  const opts = q.options.map((o) => optionLine(o, mode)).join("");
  return `
      <div class="question">
        <div class="q-text">
          <span class="q-num">${q.number}.</span>
          <span class="q-body">${escapeHtml(q.text)}</span>
        </div>
        <div class="opts">${opts}
        </div>
      </div>`;
}

function answerKeyBlock(questions: Question[]): string {
  // Compact multi-column answer key. 5 columns.
  const rows: string[] = [];
  const perRow = 5;
  for (let i = 0; i < questions.length; i += perRow) {
    const slice = questions.slice(i, i + perRow);
    const cells = slice
      .map((q) => {
        const correct = q.options.find((o) => o.correct);
        const ans = correct ? correct.label : "—";
        return `<span class="ak-item"><span class="ak-num">${q.number}.</span> <span class="ak-ans">${ans}</span></span>`;
      })
      .join("");
    rows.push(`        <div class="ak-row">${cells}</div>`);
  }
  return `
    <div class="answer-key">
      <div class="ak-title">ANSWER KEY</div>
${rows.join("\n")}
    </div>`;
}

function headerSection(
  worksheet: Worksheet,
  headerImage: string | undefined,
): string {
  const imgHtml = headerImage
    ? `<img class="school-header-img" src="${escapeHtml(headerImage)}" alt="School Header" />`
    : `<div class="school-header-placeholder">School Header</div>`;

  const classLine = escapeHtml(worksheet.className || "—");
  const subjectLine = escapeHtml(worksheet.subject || "—");
  const chapNo = escapeHtml(worksheet.chapterNumber || "—");
  const chapName = escapeHtml(worksheet.chapterName || "—");

  return `
    <header class="ws-header">
      <div class="ws-header-img-wrap">
        ${imgHtml}
      </div>
      <div class="ws-info">
        <div class="ws-info-row">
          <div class="ws-info-cell">
            <span class="ws-info-label">CLASS:</span>
            <span class="ws-info-value">${classLine}</span>
          </div>
          <div class="ws-info-cell">
            <span class="ws-info-label">SUBJECT:</span>
            <span class="ws-info-value">${subjectLine}</span>
          </div>
        </div>
        <div class="ws-info-row">
          <div class="ws-info-cell">
            <span class="ws-info-label">CHAPTER NO.:</span>
            <span class="ws-info-value">${chapNo}</span>
          </div>
          <div class="ws-info-cell">
            <span class="ws-info-label">CHAPTER NAME:</span>
            <span class="ws-info-value">${chapName}</span>
          </div>
        </div>
      </div>
    </header>`;
}

export function buildWorksheetHtml(input: PdfTemplateInput): string {
  const { worksheet, headerImage, previewMode } = input;
  const mode = worksheet.answerMode;
  const questions = worksheet.questions;

  const header = headerSection(worksheet, headerImage);
  const questionHtml = questions
    .map((q) => questionBlock(q, mode))
    .join("\n");
  const answerKey =
    mode === "answerKey" && questions.length > 0
      ? answerKeyBlock(questions)
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Worksheet</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* ===== A4 page setup ===== */
    @page {
      size: A4 portrait;
      margin: 15mm 16mm 15mm 16mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1f2937;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11.2pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* ===== First-page header (appears once at the top of the flow) ===== */
    .ws-header {
      break-after: avoid;
      page-break-after: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 4mm;
    }
    .ws-header-img-wrap {
      width: 100%;
      text-align: center;
      margin-bottom: 2.5mm;
    }
    .school-header-img {
      max-width: 100%;
      max-height: 32mm;
      height: auto;
      object-fit: contain;
    }
    .school-header-placeholder {
      height: 32mm;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #cbd5e1;
      color: #94a3b8;
      font-size: 12pt;
      letter-spacing: 0.1em;
    }
    /* Info block: NO line above (clean under the header image),
       a single thick rule BELOW matching the sample format. */
    .ws-info {
      border-bottom: 2.5px solid #111827;
      padding: 2mm 0 2.5mm 0;
    }
    .ws-info-row {
      display: flex;
      gap: 6mm;
      margin-bottom: 1.2mm;
    }
    .ws-info-row:last-child { margin-bottom: 0; }
    .ws-info-cell {
      flex: 1;
      font-size: 11pt;
      letter-spacing: 0.02em;
    }
    .ws-info-label {
      font-weight: 700;
      color: #1e3a5f;
      margin-right: 1.5mm;
    }
    .ws-info-value {
      font-weight: 500;
      color: #1f2937;
    }

    /* ===== Questions (start immediately after the header rule) ===== */
    .questions {
      margin-top: 4mm;
    }
    .question {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 5mm;
    }
    .q-text {
      display: flex;
      gap: 2mm;
      align-items: baseline;
      font-weight: 600;
      color: #111827;
      margin-bottom: 2mm;
    }
    .q-num {
      flex: 0 0 auto;
      min-width: 7mm;
      font-weight: 700;
      color: #1e3a5f;
    }
    .q-body { flex: 1 1 auto; }
    .opts {
      padding-left: 8mm;
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
    }
    .opt {
      display: flex;
      gap: 2mm;
      align-items: baseline;
      font-size: 11pt;
      color: #1f2937;
    }
    .opt-label {
      flex: 0 0 auto;
      min-width: 6mm;
      font-weight: 600;
      color: #374151;
    }
    .opt-text { flex: 1 1 auto; }

    /* ===== Answer Key ===== */
    .answer-key {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 8mm;
      padding-top: 4mm;
      border-top: 1.5px solid #1e3a5f;
    }
    .ak-title {
      text-align: center;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.25em;
      color: #1e3a5f;
      margin-bottom: 4mm;
    }
    .ak-row {
      display: flex;
      gap: 4mm;
      margin-bottom: 2.5mm;
      justify-content: flex-start;
    }
    .ak-item {
      flex: 1 1 calc(20% - 4mm);
      min-width: 0;
      font-size: 11pt;
      color: #1f2937;
    }
    .ak-num { font-weight: 700; color: #1e3a5f; margin-right: 1.5mm; }
    .ak-ans { font-weight: 600; }
    /* Preview-only: hide the banner image's built-in bottom rule (the PDF
       path trims it server-side via sharp, so this class is not used there). */
    body.preview-mode .school-header-img {
      clip-path: inset(0 0 6.5% 0);
    }
  </style>
</head>
<body${previewMode ? ' class="preview-mode"' : ''}>
  ${header}
  <section class="questions">
${questionHtml}
  </section>
  ${answerKey}
</body>
</html>`;
}

/** Build a safe, descriptive filename for the generated PDF. */
export function buildFilename(worksheet: Worksheet): string {
  const slug = (s: string) =>
    s
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "Untitled";
  const cls = slug(worksheet.className);
  const subj = slug(worksheet.subject);
  const chap = worksheet.chapterNumber
    ? `Chapter-${slug(worksheet.chapterNumber)}`
    : "Chapter";
  const name = slug(worksheet.chapterName);
  return `${cls}_${subj}_${chap}_${name}.pdf`;
}
