// CBSE-style Mid-Term Examination paper template.
//
// Replicates the layout of the uploaded MT_Subject_Grade_8.docx:
//   - School banner image at top (page 1 only)
//   - "Mid-Term Examination" centered, bold, underlined, serif (Times)
//   - Grade / Subject / Max Marks row (bold labels)
//   - Time / Date row (bold)
//   - "GENERAL INSTRUCTIONS" heading, underlined
//   - HR line
//   - 7 instruction bullet points (diamond ◆ bullets)
//   - HR line
//   - Section A–E with per-question marks, questions flow naturally
//   - Footer: doc code (left) + "Page X of Y" (right), thin line above
//   - Serif font (Times New Roman / Tinos) throughout
//
// The font used is "Tinos" (a metric-compatible Times New Roman alternative
// available on Google Fonts) with fallback to system serif.

import { AnswerMode, Question, Worksheet } from "../worksheet/types";

export interface ExamTemplateInput {
  worksheet: Worksheet;
  headerImage?: string;
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

function examQuestionBlock(q: Question, mode: AnswerMode): string {
  // Marks badge shown after the question number
  const marks = q.marks ? `<span class="ex-marks">[${q.marks}]</span>` : "";

  let bodyHtml = "";
  switch (q.type) {
    case "mcq":
      bodyHtml = q.options.length
        ? `<div class="ex-opts">${q.options
            .map(
              (opt) =>
                `<div class="ex-opt"><span class="ex-opt-label">${escapeHtml(opt.label)}.</span> <span class="ex-opt-text">${escapeHtml(opt.text)}${mode === "marked" && opt.correct ? " *" : ""}</span></div>`,
            )
            .join("")}</div>`
        : "";
      break;
    case "trueFalse":
      bodyHtml = `<div class="ex-tf">${q.options
        .map(
          (opt) =>
            `<span class="ex-tf-opt">${escapeHtml(opt.text)}${mode === "marked" && opt.correct ? " *" : ""}</span>`,
        )
        .join(" &nbsp;&nbsp; ")}</div>`;
      break;
    case "fillBlank":
      // blank or answer injected inline
      bodyHtml = "";
      break;
    case "descriptive":
      if (mode === "answerKey" && q.answer.trim()) {
        bodyHtml = `<div class="ex-ans"><b>Ans:</b> ${escapeHtml(q.answer)}</div>`;
      } else {
        bodyHtml = `<div class="ex-lines"></div>`;
      }
      break;
  }

  const questionText =
    q.type === "fillBlank"
      ? `${escapeHtml(q.text)}${
          mode === "marked" || mode === "answerKey"
            ? ` <i>(${escapeHtml(q.answer)})</i>`
            : ` ${"<span class='ex-blank'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>"}`
        }`
      : escapeHtml(q.text);

  return `
      <div class="ex-question">
        <div class="ex-q-text">
          <span class="ex-q-num">${q.number}.</span>
          <span class="ex-q-body">${questionText}</span>${marks}
        </div>${bodyHtml}
      </div>`;
}

function examHeader(worksheet: Worksheet, headerImage: string | undefined): string {
  const imgHtml = headerImage
    ? `<img class="ex-banner" src="${escapeHtml(headerImage)}" alt="School Header" />`
    : "";

  const m = worksheet.examMeta;
  const title = escapeHtml(m.examTitle || "Mid-Term Examination");
  const grade = escapeHtml(m.grade || "");
  const subject = escapeHtml(m.subject || worksheet.subject || "");
  const maxMarks = escapeHtml(m.maxMarks || "80");
  const duration = escapeHtml(m.duration || "3 Hours");
  const date = escapeHtml(m.date || "");

  return `
    <header class="ex-header">
      <div class="ex-banner-wrap">${imgHtml}</div>
      <h1 class="ex-title">${title}</h1>
      <div class="ex-meta-row">
        <span class="ex-meta-cell"><b>Grade:</b> ${grade}</span>
        <span class="ex-meta-cell ex-meta-center"><b>Sub:</b> ${subject}</span>
        <span class="ex-meta-cell ex-meta-right"><b>Mark :</b> ${maxMarks}</span>
      </div>
      <div class="ex-meta-row">
        <span class="ex-meta-cell"><b>Time :</b> ${duration}</span>
        <span class="ex-meta-cell ex-meta-right"><b>Date :</b> ${date}</span>
      </div>
    </header>`;
}

function instructionsBlock(worksheet: Worksheet): string {
  const items = worksheet.examMeta.instructions
    .filter((i) => i.trim())
    .map((ins) => `<li>${escapeHtml(ins)}</li>`)
    .join("");
  if (!items) return "";
  return `
    <div class="ex-instructions">
      <div class="ex-inst-heading">GENERAL INSTRUCTIONS</div>
      <hr class="ex-hr" />
      <ul class="ex-inst-list">${items}</ul>
      <hr class="ex-hr" />
    </div>`;
}

function sectionsBlock(worksheet: Worksheet, mode: AnswerMode): string {
  const questions = worksheet.questions;
  const sections = worksheet.sections.filter(
    (s) => s.questionIds.length > 0,
  );

  if (sections.length === 0) {
    // No sections — just render all questions flat
    return questions.map((q) => examQuestionBlock(q, mode)).join("\n");
  }

  const parts: string[] = [];
  const assignedIds = new Set<string>();
  for (const sec of sections) {
    parts.push(`<div class="ex-section"><div class="ex-section-title">${escapeHtml(sec.title)}</div>`);
    for (const qId of sec.questionIds) {
      const q = questions.find((qq) => qq.id === qId);
      if (q) {
        parts.push(examQuestionBlock(q, mode));
        assignedIds.add(qId);
      }
    }
    parts.push(`</div>`);
  }
  const unassigned = questions.filter((q) => !assignedIds.has(q.id));
  for (const q of unassigned) parts.push(examQuestionBlock(q, mode));
  return parts.join("\n");
}

function footerBlock(_worksheet: Worksheet): string {
  // The page number is populated via CSS counters (@page + counter(page))
  // in the <style> block, using the .ex-pagenum / .ex-pagecount spans.
  return `
    <div class="ex-footer">
      <span class="ex-footer-code"></span>
      <span class="ex-footer-page"></span>
    </div>`;
}

export function buildExamHtml(input: ExamTemplateInput): string {
  const { worksheet, headerImage } = input;
  const mode = worksheet.answerMode;

  const header = examHeader(worksheet, headerImage);
  const instructions = instructionsBlock(worksheet);
  const questions = sectionsBlock(worksheet, mode);
  const footer = footerBlock(worksheet);

  const answerKey =
    mode === "answerKey" && worksheet.questions.length > 0
      ? `<div class="ex-answer-key"><div class="ex-ak-title">ANSWER KEY</div>${worksheet.questions
          .map((q) => {
            let ans = "—";
            if (q.type === "mcq" || q.type === "trueFalse") {
              const c = q.options.find((o) => o.correct);
              ans = c ? c.label : "—";
            } else if (q.answer.trim()) {
              ans = q.answer.trim().slice(0, 30);
            }
            return `<span class="ex-ak-item"><b>${q.number}.</b> ${escapeHtml(ans)}</span>`;
          })
          .join(" &nbsp; ")}</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Examination Paper</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
  <style>
    /* ===== A4 page setup ===== */
    @page {
      size: A4 portrait;
      margin: 12mm 18mm 18mm 18mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Tinos', 'Times New Roman', Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* ===== Header (page 1 only) ===== */
    .ex-header { break-after: avoid; page-break-after: avoid; text-align: center; margin-bottom: 4mm; }
    .ex-banner-wrap { width: 100%; text-align: center; margin-bottom: 3mm; }
    .ex-banner { max-width: 100%; max-height: 30mm; height: auto; object-fit: contain; }
    .ex-title {
      font-size: 18pt;
      font-weight: 700;
      text-align: center;
      text-decoration: underline;
      margin: 2mm 0 3mm 0;
      letter-spacing: 0.02em;
    }
    .ex-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 12pt;
      margin-bottom: 1mm;
    }
    .ex-meta-cell { flex: 1; }
    .ex-meta-center { text-align: center; }
    .ex-meta-right { text-align: right; }

    /* ===== Instructions ===== */
    .ex-instructions { break-inside: avoid; page-break-inside: avoid; margin-bottom: 4mm; }
    .ex-inst-heading {
      font-size: 12pt;
      font-weight: 700;
      text-decoration: underline;
      margin-bottom: 1.5mm;
    }
    .ex-hr { border: 0; border-top: 1px solid #000; margin: 1mm 0; }
    .ex-inst-list {
      list-style: none;
      padding-left: 6mm;
      margin: 1.5mm 0;
    }
    .ex-inst-list li {
      position: relative;
      padding-left: 5mm;
      margin-bottom: 0.8mm;
      font-size: 11.5pt;
    }
    .ex-inst-list li::before {
      content: "◆";
      position: absolute;
      left: 0;
      font-size: 8pt;
      top: 2pt;
    }

    /* ===== Sections ===== */
    .ex-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 4mm; }
    .ex-section-title {
      font-size: 12pt;
      font-weight: 700;
      text-decoration: underline;
      margin-bottom: 2mm;
      margin-top: 2mm;
    }

    /* ===== Questions ===== */
    .ex-question {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 4mm;
    }
    .ex-q-text {
      display: flex;
      gap: 2mm;
      align-items: baseline;
      font-size: 12pt;
      margin-bottom: 1.5mm;
    }
    .ex-q-num { font-weight: 700; flex: 0 0 auto; min-width: 7mm; }
    .ex-q-body { flex: 1 1 auto; }
    .ex-marks {
      font-size: 11pt;
      font-weight: 600;
      color: #000;
      margin-left: 2mm;
      white-space: nowrap;
    }
    .ex-opts {
      padding-left: 8mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10mm;
      row-gap: 1mm;
    }
    .ex-opt { font-size: 11.5pt; }
    .ex-opt-label { font-weight: 600; margin-right: 1.5mm; }
    .ex-opt-text {}
    .ex-tf {
      padding-left: 8mm;
      font-size: 11.5pt;
    }
    .ex-tf-opt { font-weight: 500; margin-right: 12mm; }
    .ex-blank {
      display: inline-block;
      border-bottom: 1px solid #000;
      min-width: 25mm;
      height: 1px;
      vertical-align: baseline;
    }
    .ex-lines {
      margin: 2mm 0 0 8mm;
      border-bottom: 1px solid #666;
      height: 8mm;
    }
    .ex-ans { margin: 2mm 0 0 8mm; font-size: 11.5pt; }

    /* ===== Answer Key ===== */
    .ex-answer-key {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 6mm;
      padding-top: 3mm;
      border-top: 1.5px solid #000;
    }
    .ex-ak-title {
      text-align: center;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.2em;
      margin-bottom: 3mm;
    }
    .ex-ak-item {
      display: inline-block;
      margin-right: 8mm;
      font-size: 11.5pt;
    }

    /* ===== Footer (every page) ===== */
    /* The footer repeats on every page via position: fixed. The page number
       is populated by CSS counters (@page counter). */
    @page {
      counter-increment: page;
    }
    .ex-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 18mm 6mm 18mm;
      font-size: 10pt;
      border-top: 1px solid #999;
      padding-top: 2mm;
      display: flex;
      justify-content: space-between;
    }
    .ex-footer-code::before { content: ""; }
    .ex-footer-page::before {
      content: "Page " counter(page) " of " counter(pages);
    }
  </style>
</head>
<body>
  ${header}
  ${instructions}
  ${questions}
  ${answerKey}
  ${footer}
</body>
</html>`;
}

/** Build a safe filename for the exam PDF. */
export function buildExamFilename(worksheet: Worksheet): string {
  const m = worksheet.examMeta;
  const slug = (s: string) =>
    s.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "Untitled";
  const grade = slug(m.grade);
  const subject = slug(m.subject || worksheet.subject);
  const title = slug(m.examTitle);
  return `${title}_${subject}_Grade-${grade || "X"}.pdf`;
}
