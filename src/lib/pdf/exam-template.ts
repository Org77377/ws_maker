// CBSE-style Mid-Term Examination paper template.
//
// Layout (replicates uploaded MT_Subject_Grade_8.docx):
//   - School banner image at top (page 1 only)
//   - "Mid-Term Examination" centered, bold, underlined, serif
//   - Info table (3 columns):
//       Left:   Grade + Time  (two lines stacked)
//       Center: Subject
//       Right:  Mark + Date   (two lines stacked)
//   - "GENERAL INSTRUCTIONS" heading, underlined + HR
//   - Instruction bullet points (diamond ◆)
//   - HR line
//   - Sections: each with title + instruction on left, marks carriage on right
//       e.g. "Section A — Answer the following (any 5)    40 x 0.5 = 20"
//     followed by the section's questions
//   - Footer (every page): "SPS_<year>_<term>_G.<grade>_QP_<subject>" (left)
//       + "Page X of Y" (right), thin line above
//   - Serif font (Tinos / Times New Roman) throughout

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

/** Build the footer code: SPS_<year>_<term>_G.<grade>_QP_<subject>.
 *  Subject is auto-filled from the examMeta.subject (or worksheet.subject). */
function buildFooterCode(worksheet: Worksheet): string {
  const m = worksheet.examMeta;
  const year = (m.footerYear || "").replace(/\s+/g, "");
  const term = (m.footerTerm || "").replace(/\s+/g, "");
  const grade = (m.grade || "").replace(/\s+/g, "");
  const subject = (m.subject || worksheet.subject || "Subject")
    .replace(/\s+/g, "");
  return `SPS_${year}_${term}_G.${grade}_QP_${subject}`;
}

/** Compute the marks carriage, e.g. "40 x 0.5 = 20".
 *  Falls back to just the total marks if per-question data is missing. */
function buildMarksCarriage(section: {
  questionCount: string;
  perQuestionMarks: string;
  marks: string;
}): string {
  const qc = (section.questionCount || "").trim();
  const pqm = (section.perQuestionMarks || "").trim();
  const total = (section.marks || "").trim();
  if (qc && pqm && total) {
    return `${qc} × ${pqm} = ${total}`;
  }
  if (total) return total;
  return "";
}

function examQuestionBlock(q: Question, mode: AnswerMode): string {
  const marks = q.marks ? `<span class="ex-marks">(${q.marks})</span>` : "";
  let bodyHtml = "";
  switch (q.type) {
    case "mcq":
      bodyHtml = q.options.length
        ? `<div class="ex-opts">${q.options
            .map(
              (opt) =>
                `<div class="ex-opt"><span class="ex-opt-checkbox">☐</span><span class="ex-opt-label">${escapeHtml(opt.label)}.</span> <span class="ex-opt-text">${escapeHtml(opt.text)}${mode === "marked" && opt.correct ? " *" : ""}</span></div>`,
            )
            .join("")}</div>`
        : "";
      break;
    case "trueFalse":
      bodyHtml = `<div class="ex-tf">${q.options
        .map(
          (opt) =>
            `<span class="ex-tf-opt"><span class="ex-opt-checkbox">☐</span> ${escapeHtml(opt.text)}${mode === "marked" && opt.correct ? " *" : ""}</span>`,
        )
        .join(" &nbsp;&nbsp; ")}</div>`;
      break;
    case "fillBlank":
      // No auto-generated blank — the user types ___ in the question text
      // themselves. In marked/answerKey mode, append the answer.
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

  // For fillBlank, append the answer in marked/answerKey mode.
  // No auto-generated blank line — the user includes ___ in the question text.
  const questionText =
    q.type === "fillBlank" &&
    (mode === "marked" || mode === "answerKey") &&
    q.answer.trim()
      ? `${escapeHtml(q.text)} <i>(${escapeHtml(q.answer)})</i>`
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

  // Info table: 3 columns (left=Grade+Time, center=Subject, right=Mark+Date)
  // Title is below the logo, above the meta table.
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
  // Use inline bullet character (•) instead of CSS ::before pseudo-elements,
  // which don't render reliably in Playwright/Puppeteer PDF output.
  const items = worksheet.examMeta.instructions
    .filter((i) => i.trim())
    .map((ins) => `<li><span class="ex-bullet">•</span> ${escapeHtml(ins)}</li>`)
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

function sectionsBlock(worksheet: Worksheet, mode: AnswerMode): string {
  const questions = worksheet.questions;
  const sections = worksheet.sections;

  // If no sections defined, just render all questions flat
  if (sections.length === 0) {
    return questions.map((q) => examQuestionBlock(q, mode)).join("\n");
  }

  const parts: string[] = [];
  const assignedIds = new Set<string>();

  // Renumber questions in visual order (section by section) so numbering
  // is sequential 1, 2, 3... regardless of how questions were added.
  let visualNumber = 1;
  const renumberedQuestions = new Map<string, Question>();

  for (const sec of sections) {
    for (const qId of sec.questionIds) {
      const q = questions.find((qq) => qq.id === qId);
      if (q) {
        renumberedQuestions.set(qId, { ...q, number: visualNumber++ });
      }
    }
  }
  // Unassigned questions continue numbering
  for (const q of questions) {
    if (!renumberedQuestions.has(q.id)) {
      renumberedQuestions.set(q.id, { ...q, number: visualNumber++ });
    }
  }

  for (const sec of sections) {
    // Section header layout:
    //   Line 1: "Section A" — CENTERED
    //   Line 2: "• Multiple Choice Questions (answer any 4)" on LEFT,
    //           "40 × 0.5 = 20" on RIGHT
    const instruction = sec.instruction
      ? `<span class="ex-sec-instr">• ${escapeHtml(sec.instruction)}</span>`
      : '<span class="ex-sec-instr">&nbsp;</span>';
    const carriage = buildMarksCarriage(sec);
    const carriageHtml = carriage
      ? `<span class="ex-sec-marks">${escapeHtml(carriage)}</span>`
      : "";

    parts.push(
      `<div class="ex-section">` +
        `<div class="ex-section-header">` +
          `<div class="ex-section-name">${escapeHtml(sec.title)}</div>` +
          `<div class="ex-section-sub">${instruction}${carriageHtml}</div>` +
        `</div>`,
    );

    // Render questions assigned to this section (with renumbered numbers)
    if (sec.questionIds.length > 0) {
      for (const qId of sec.questionIds) {
        const q = renumberedQuestions.get(qId);
        if (q) {
          parts.push(examQuestionBlock(q, mode));
          assignedIds.add(qId);
        }
      }
    }

    parts.push(`</div>`);
  }

  // Render any unassigned questions (not in a section)
  const unassigned = questions.filter((q) => !assignedIds.has(q.id));
  for (const q of unassigned) {
    const rq = renumberedQuestions.get(q.id) || q;
    parts.push(examQuestionBlock(rq, mode));
  }

  return parts.join("\n");
}

export function buildExamHtml(input: ExamTemplateInput): string {
  const { worksheet, headerImage } = input;
  const mode = worksheet.answerMode;

  const header = examHeader(worksheet, headerImage);
  const instructions = instructionsBlock(worksheet);
  const questions = sectionsBlock(worksheet, mode);

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
    /* ===== A4 page setup =====
       Top margin reduced to 8mm so questions start on page 1.
       Bottom margin is 20mm to accommodate the PDF engine footer. */
    @page {
      size: A4 portrait;
      margin: 8mm 18mm 20mm 18mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Tinos', 'Times New Roman', Times, Georgia, serif;
      font-size: 11.5pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* ===== Header (page 1 only) ===== */
    .ex-header { text-align: center; margin-bottom: 3mm; break-after: avoid; page-break-after: avoid; }
    .ex-banner-wrap { width: 100%; text-align: center; margin-bottom: 2mm; }
    .ex-banner { max-width: 100%; max-height: 30mm; height: auto; object-fit: contain; }
    .ex-title {
      font-size: 16pt;
      font-weight: 700;
      text-align: center;
      text-decoration: underline;
      margin: 1mm 0 2mm 0;
      letter-spacing: 0.02em;
    }
    .ex-meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1mm;
      font-size: 12.5pt;
    }
    .ex-meta-table td { padding: 0.5mm 0; vertical-align: top; }
    .ex-meta-left { text-align: left; width: 33%; }
    .ex-meta-center { text-align: center; width: 34%; }
    .ex-meta-right { text-align: right; width: 33%; }

    /* ===== Instructions ===== */
    .ex-instructions { break-inside: avoid; page-break-inside: avoid; margin-bottom: 5mm; }
    .ex-hr { border: 0; border-top: 1px solid #000; margin: 1mm 0; width: 100%; }
    .ex-inst-heading {
      font-size: 12.5pt;
      font-weight: 700;
      text-decoration: underline;
      margin: 1mm 0 1.5mm 0;
    }
    .ex-inst-list {
      list-style: none;
      padding: 0;
      margin: 0 0 0 3mm;
    }
    .ex-inst-list li {
      padding-left: 4mm;
      margin-bottom: 0.8mm;
      font-size: 11.5pt;
      position: relative;
    }
    .ex-bullet {
      position: absolute;
      left: 0;
      font-size: 12pt;
      line-height: 1;
    }

    /* ===== Sections =====
       NOTE: .ex-section does NOT use break-inside: avoid — if it did, the
       entire section (header + all questions) would be pushed to the next
       page when it doesn't fit, leaving page 1 empty after instructions.
       Individual questions (.ex-question) already have break-inside: avoid. */
    .ex-section { margin-bottom: 8mm; }
    .ex-section-header {
      border-bottom: 1px solid #000;
      padding-bottom: 1mm;
      margin-bottom: 3mm;
      margin-top: 3mm;
      text-align: left;
      break-after: avoid;
      page-break-after: avoid;
    }
    .ex-section-name {
      font-size: 12.5pt;
      font-weight: 700;
      text-align: center;
      text-decoration: underline;
      margin-bottom: 1mm;
    }
    .ex-section-sub {
      font-size: 12.5pt;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      text-align: left;
    }
    .ex-sec-instr { font-weight: 400; font-size: 12.5pt; text-align: left; }
    .ex-sec-marks {
      font-size: 12.5pt;
      font-weight: 600;
      white-space: nowrap;
      text-align: right;
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
      font-size: 11.5pt;
      margin-bottom: 1.5mm;
    }
    .ex-q-num { font-weight: 700; flex: 0 0 auto; min-width: 7mm; }
    .ex-q-body { flex: 1 1 auto; }
    .ex-marks {
      font-size: 11.5pt;
      font-weight: 600;
      margin-left: 2mm;
      white-space: nowrap;
    }
    .ex-opts {
      padding-left: 8mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10mm;
      row-gap: 1.5mm;
    }
    .ex-opt { font-size: 11.5pt; display: flex; align-items: baseline; gap: 1.5mm; }
    .ex-opt-checkbox { font-size: 11pt; line-height: 1; }
    .ex-opt-label { font-weight: 600; }
    .ex-tf { padding-left: 8mm; font-size: 11.5pt; }
    .ex-tf-opt { font-weight: 500; margin-right: 12mm; display: inline-flex; align-items: baseline; gap: 1.5mm; }
    .ex-lines { margin: 2mm 0 0 8mm; border-bottom: 1px solid #666; height: 8mm; }
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
    .ex-ak-item { display: inline-block; margin-right: 8mm; font-size: 11.5pt; }
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

/** Build the footer template HTML for the PDF engine (Puppeteer/Playwright).
 *  Uses [pageNumber] and [totalPages] placeholders. */
export function buildExamFooterTemplate(worksheet: Worksheet): string {
  const code = buildFooterCode(worksheet);
  // The footer template is restricted HTML (no external resources, inline CSS only).
  // Margin must match the page bottom margin (20mm).
  return `<div style="width: 100%; font-family: 'Times New Roman', serif; font-size: 9pt; color: #333; display: flex; justify-content: space-between; padding: 0 18mm 6mm 18mm; border-top: 1px solid #999; margin: 0 18mm;">
    <span>${escapeHtml(code)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
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
