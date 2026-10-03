// CBSE-style Examination paper template — professional, print-first layout.
//
// Key improvements:
// - CSS grid for questions: [number 9mm | text 1fr | marks 10mm] — perfect alignment
// - No CSS checkbox; MCQ uses bold "A." "B." letters in 2-col grid (1-col if options are long)
// - Self-hosted fonts via @font-face (Tinos) + system fallback for Indic scripts
// - CSS variables for spacing tokens (--gap-q, --gap-opt) controlled by presets
// - Section heading centered; title + marks on a sub-row (left/right)
// - Section heading + first question kept together (break-after: avoid)
// - Individual questions: break-inside: avoid (never split)
// - Footer padding matches @page margins (via shared constants)

import { AnswerMode, Question, Worksheet } from "../worksheet/types";
import {
  PAGE_CSS,
  PAGE_MARGINS,
  FOOTER_PADDING_LEFT,
  FOOTER_PADDING_RIGHT,
  type PrintPreset,
} from "./page-geometry";

export interface ExamTemplateInput {
  worksheet: Worksheet;
  headerImage?: string;
  previewMode?: boolean;
  preset?: PrintPreset;
  /** Marks position: "right" (default) or "left" */
  marksPosition?: "left" | "right";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFooterCode(worksheet: Worksheet): string {
  const m = worksheet.examMeta;
  const year = (m.footerYear || "").replace(/\s+/g, "");
  const term = (m.footerTerm || "").replace(/\s+/g, "");
  const grade = (m.grade || "").replace(/\s+/g, "");
  const subject = (m.subject || worksheet.subject || "Subject").replace(/\s+/g, "");
  return `SPS_${year}_${term}_G.${grade}_QP_${subject}`;
}

function buildMarksCarriage(section: {
  questionCount: string; perQuestionMarks: string; marks: string;
}): string {
  const qc = (section.questionCount || "").trim();
  const pqm = (section.perQuestionMarks || "").trim();
  const total = (section.marks || "").trim();
  if (qc && pqm && total) return `${qc} × ${pqm} = ${total}`;
  if (total) return total;
  return "";
}

/** Detect if any MCQ option exceeds ~45 chars → use single-column layout */
function shouldUseSingleColumn(options: { text: string }[]): boolean {
  return options.some((o) => o.text.length > 45);
}

function examQuestionBlock(q: Question, mode: AnswerMode, marksLeft: boolean): string {
  const marksHtml = q.marks ? `<span class="ex-marks">(${q.marks})</span>` : "";

  let bodyHtml = "";
  switch (q.type) {
    case "mcq": {
      const single = shouldUseSingleColumn(q.options);
      const cols = single ? "1fr" : "1fr 1fr";
      bodyHtml = q.options.length
        ? `<div class="ex-opts" style="grid-template-columns:${cols}">${q.options
            .map((opt) =>
              `<div class="ex-opt">` +
              `<span class="ex-opt-label">${escapeHtml(opt.label)}.</span>` +
              `<span class="ex-opt-text">${escapeHtml(opt.text)}${mode === "marked" && opt.correct ? " *" : ""}</span>` +
              `</div>`,
            )
            .join("")}</div>`
        : "";
      break;
    }
    case "trueFalse":
      bodyHtml = `<div class="ex-tf">${q.options
        .map((opt) =>
          `<span class="ex-tf-opt">${escapeHtml(opt.text)}${mode === "marked" && opt.correct ? " *" : ""}</span>`,
        )
        .join(" &nbsp;&nbsp; ")}</div>`;
      break;
    case "fillBlank":
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
    q.type === "fillBlank" && (mode === "marked" || mode === "answerKey") && q.answer.trim()
      ? `${escapeHtml(q.text)} <i>(${escapeHtml(q.answer)})</i>`
      : escapeHtml(q.text);

  // CSS grid: [number | text | marks] — marks on right by default, left if configured
  const marksCol = marksLeft
    ? `<span class="ex-q-marks ex-q-marks--left">${marksHtml}</span>`
    : `<span class="ex-q-marks">${marksHtml}</span>`;
  const numCol = `<span class="ex-q-num">${q.number}.</span>`;
  const textCol = `<span class="ex-q-body">${questionText}</span>`;

  // Grid template: if marks on left, put marks first
  const gridTemplate = marksLeft
    ? "10mm 1fr 9mm"
    : "9mm 1fr 10mm";

  return `
      <div class="ex-question" style="display:grid;grid-template-columns:${gridTemplate};gap:0;">
        ${marksLeft ? marksCol + numCol + textCol : numCol + textCol + marksCol}
      </div>${bodyHtml}`;
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
      <table class="ex-meta-table">
        <tr>
          <td class="ex-meta-left"><b>Grade:</b> ${grade}</td>
          <td class="ex-meta-center"><b>Sub:</b> ${subject}</td>
          <td class="ex-meta-right"><b>Mark :</b> ${maxMarks}</td>
        </tr>
        <tr>
          <td class="ex-meta-left"><b>Time :</b> ${duration}</td>
          <td class="ex-meta-center">&nbsp;</td>
          <td class="ex-meta-right"><b>Date :</b> ${date}</td>
        </tr>
      </table>
    </header>`;
}

function instructionsBlock(worksheet: Worksheet): string {
  const items = worksheet.examMeta.instructions
    .filter((i) => i.trim())
    .map((ins) => `<li>• ${escapeHtml(ins)}</li>`)
    .join("");
  if (!items) return "";
  return `
    <div class="ex-instructions">
      <hr class="ex-hr" />
      <div class="ex-inst-heading">GENERAL INSTRUCTIONS</div>
      <ul class="ex-inst-list">${items}</ul>
      <hr class="ex-hr" />
    </div>`;
}

function sectionsBlock(worksheet: Worksheet, mode: AnswerMode, marksLeft: boolean): string {
  const questions = worksheet.questions;
  const sections = worksheet.sections;
  if (sections.length === 0) {
    return questions.map((q) => examQuestionBlock(q, mode, marksLeft)).join("\n");
  }

  const parts: string[] = [];
  const assignedIds = new Set<string>();
  let visualNumber = 1;
  const renumbered = new Map<string, Question>();

  for (const sec of sections) {
    for (const qId of sec.questionIds) {
      const q = questions.find((qq) => qq.id === qId);
      if (q) renumbered.set(qId, { ...q, number: visualNumber++ });
    }
  }
  for (const q of questions) {
    if (!renumbered.has(q.id)) renumbered.set(q.id, { ...q, number: visualNumber++ });
  }

  for (const sec of sections) {
    const instruction = sec.instruction
      ? `<span class="ex-sec-instr">• ${escapeHtml(sec.instruction)}</span>`
      : '<span class="ex-sec-instr">&nbsp;</span>';
    const carriage = buildMarksCarriage(sec);
    const carriageHtml = carriage ? `<span class="ex-sec-marks">${escapeHtml(carriage)}</span>` : "";

    parts.push(
      `<div class="ex-section">` +
        `<div class="ex-section-header">` +
          `<div class="ex-section-name">${escapeHtml(sec.title)}</div>` +
          `<div class="ex-section-sub">${instruction}${carriageHtml}</div>` +
        `</div>`,
    );

    if (sec.questionIds.length > 0) {
      for (const qId of sec.questionIds) {
        const q = renumbered.get(qId);
        if (q) { parts.push(examQuestionBlock(q, mode, marksLeft)); assignedIds.add(qId); }
      }
    }
    parts.push(`</div>`);
  }

  const unassigned = questions.filter((q) => !assignedIds.has(q.id));
  for (const q of unassigned) {
    const rq = renumbered.get(q.id) || q;
    parts.push(examQuestionBlock(rq, mode, marksLeft));
  }
  return parts.join("\n");
}

export function buildExamHtml(input: ExamTemplateInput): string {
  const { worksheet, headerImage, preset, marksPosition } = input;
  const mode = worksheet.answerMode;
  const p = preset ?? { bodyFontSize: "10.5pt", headingFontSize: "12pt", metaFontSize: "11.5pt", gapQuestion: "3.5mm", gapOption: "1.2mm", lineHeight: "1.3" } as PrintPreset;
  const marksLeft = marksPosition === "left";

  const header = examHeader(worksheet, headerImage);
  const instructions = instructionsBlock(worksheet);
  const questions = sectionsBlock(worksheet, mode, marksLeft);

  const answerKey = mode === "answerKey" && worksheet.questions.length > 0
    ? `<div class="ex-answer-key"><div class="ex-ak-title">ANSWER KEY</div>${worksheet.questions
        .map((q) => {
          let ans = "—";
          if (q.type === "mcq" || q.type === "trueFalse") {
            const c = q.options.find((o) => o.correct); ans = c ? c.label : "—";
          } else if (q.answer.trim()) ans = q.answer.trim().slice(0, 30);
          return `<span class="ex-ak-item"><b>${q.number}.</b> ${escapeHtml(ans)}</span>`;
        }).join(" &nbsp; ")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Examination Paper</title>
  <style>
    /* ===== Self-hosted fonts (no Google Fonts link) =====
       Tinos is served from /public/fonts/ in the preview.
       The PDF renderer replaces /fonts/ with file:// URLs.
       Fallback to system fonts for Indic scripts. */
    @font-face {
      font-family: 'Tinos';
      src: url('/fonts/Tinos-Regular.ttf') format('truetype');
      font-weight: 400; font-style: normal; font-display: block;
    }
    @font-face {
      font-family: 'Tinos';
      src: url('/fonts/Tinos-Bold.ttf') format('truetype');
      font-weight: 700; font-style: normal; font-display: block;
    }
    @font-face {
      font-family: 'Tinos';
      src: url('/fonts/Tinos-Italic.ttf') format('truetype');
      font-weight: 400; font-style: italic; font-display: block;
    }

    /* ===== Page geometry (single source of truth) ===== */
    ${PAGE_CSS}

    /* ===== Spacing tokens (controlled by presets) ===== */
    :root {
      --fs-body: ${p.bodyFontSize};
      --fs-heading: ${p.headingFontSize};
      --fs-meta: ${p.metaFontSize};
      --gap-q: ${p.gapQuestion};
      --gap-opt: ${p.gapOption};
      --lh: ${p.lineHeight};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      color: #000;
      font-family: 'Tinos', 'Noto Serif', 'Noto Serif Devanagari', 'Noto Serif Kannada', 'Times New Roman', Times, Georgia, serif;
      font-size: var(--fs-body);
      line-height: var(--lh);
      -webkit-font-smoothing: antialiased;
    }

    /* ===== Header ===== */
    .ex-header { text-align: center; margin-bottom: 3mm; break-after: avoid; }
    .ex-banner-wrap { margin-bottom: 2mm; }
    .ex-banner { max-width: 100%; max-height: 28mm; height: auto; object-fit: contain; }
    .ex-title { font-size: 16pt; font-weight: 700; text-align: center; text-decoration: underline; margin: 1mm 0 2mm; }
    .ex-meta-table { width: 100%; border-collapse: collapse; font-size: var(--fs-meta); }
    .ex-meta-table td { padding: 0.4mm 0; }
    .ex-meta-left { text-align: left; width: 33%; }
    .ex-meta-center { text-align: center; width: 34%; }
    .ex-meta-right { text-align: right; width: 33%; }

    /* ===== Instructions ===== */
    .ex-instructions { break-inside: avoid; margin-bottom: 4mm; orphans: 3; widows: 3; }
    .ex-hr { border: 0; border-top: 0.5px solid #000; margin: 1mm 0; }
    .ex-inst-heading { font-size: var(--fs-heading); font-weight: 700; text-decoration: underline; margin: 1mm 0 1.5mm; }
    .ex-inst-list { list-style: none; padding-left: 3mm; }
    .ex-inst-list li { padding-left: 3mm; margin-bottom: 0.6mm; font-size: var(--fs-body); }

    /* ===== Sections ===== */
    .ex-section { margin-bottom: 6mm; }
    .ex-section-header { border-bottom: 0.5px solid #000; padding-bottom: 1mm; margin-bottom: var(--gap-q); margin-top: 3mm; break-after: avoid; }
    .ex-section-name { font-size: var(--fs-heading); font-weight: 700; text-align: center; text-decoration: underline; margin-bottom: 1mm; }
    .ex-section-sub { display: flex; justify-content: space-between; align-items: baseline; font-size: var(--fs-heading); }
    .ex-sec-instr { font-weight: 400; }
    .ex-sec-marks { font-weight: 600; white-space: nowrap; }

    /* ===== Questions (CSS grid: number | text | marks) ===== */
    .ex-question { break-inside: avoid; margin-bottom: var(--gap-q); align-items: baseline; }
    .ex-q-num { font-weight: 700; }
    .ex-q-body { font-weight: 400; }
    .ex-q-marks { font-weight: 600; white-space: nowrap; text-align: right; }
    .ex-q-marks--left { text-align: left; }

    /* ===== MCQ options (2-col grid, auto 1-col for long options) ===== */
    .ex-opts { padding-left: 9mm; display: grid; column-gap: 10mm; row-gap: var(--gap-opt); margin-top: 0.5mm; }
    .ex-opt { font-size: var(--fs-body); display: flex; align-items: baseline; gap: 1.5mm; }
    .ex-opt-label { font-weight: 700; min-width: 5mm; }
    .ex-opt-text { font-weight: 400; }
    /* Hanging indent for wrapped option text */
    .ex-opt-text { padding-left: 0; text-indent: 0; }

    /* ===== True/False ===== */
    .ex-tf { padding-left: 9mm; font-size: var(--fs-body); margin-top: 0.5mm; }
    .ex-tf-opt { font-weight: 400; margin-right: 12mm; }

    /* ===== Descriptive ruled lines ===== */
    .ex-lines { margin: 1mm 0 0 9mm; border-bottom: 0.5px solid #999; height: 7mm; }
    .ex-ans { margin: 1mm 0 0 9mm; font-size: var(--fs-body); }

    /* ===== Answer Key ===== */
    .ex-answer-key { break-inside: avoid; margin-top: 5mm; padding-top: 2mm; border-top: 0.5px solid #000; }
    .ex-ak-title { text-align: center; font-size: var(--fs-heading); font-weight: 700; letter-spacing: 0.15em; margin-bottom: 2mm; }
    .ex-ak-item { display: inline-block; margin-right: 6mm; font-size: var(--fs-body); }
  </style>
</head>
<body>
  ${header}
  ${instructions}
  ${questions}
  ${answerKey}
</body>
</html>`;
}

/** Footer template for the PDF engine (exact left/right alignment with body) */
export function buildExamFooterTemplate(worksheet: Worksheet): string {
  const code = buildFooterCode(worksheet);
  const pl = FOOTER_PADDING_LEFT;
  const pr = FOOTER_PADDING_RIGHT;
  return `<div style="width:100%;box-sizing:border-box;padding:0 ${pr} 0 ${pl};font-size:8.5px;font-family:'Tinos','Times New Roman',serif;color:#333;display:flex;justify-content:space-between;align-items:center;border-top:0.5px solid #666;padding-top:2mm;">
    <span>${escapeHtml(code)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
}

export function buildExamFilename(worksheet: Worksheet): string {
  const m = worksheet.examMeta;
  const slug = (s: string) => s.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "Untitled";
  return `${slug(m.examTitle)}_${slug(m.subject || worksheet.subject)}_Grade-${slug(m.grade) || "X"}.pdf`;
}
