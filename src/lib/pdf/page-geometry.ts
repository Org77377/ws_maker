// Shared page geometry constants for the exam/worksheet PDF templates.
// These are the SINGLE SOURCE OF TRUTH — the CSS @page margins, the
// page.pdf() margin option, and the footer template padding all read from
// here so the footer left/right edges always align with the body edges.

export const PAGE_MARGINS = {
  top: "10mm",
  bottom: "18mm",
  left: "17mm",
  right: "17mm",
} as const;

export const PAGE_SIZE = "A4" as const;

// CSS @page rule string (used in the template <style>)
export const PAGE_CSS = `@page { size: ${PAGE_SIZE} portrait; margin: ${PAGE_MARGINS.top} ${PAGE_MARGINS.right} ${PAGE_MARGINS.bottom} ${PAGE_MARGINS.left}; }`;

// Footer padding must match the page left/right margins
export const FOOTER_PADDING_LEFT = PAGE_MARGINS.left;
export const FOOTER_PADDING_RIGHT = PAGE_MARGINS.right;

// Print presets (font size + spacing tokens)
export interface PrintPreset {
  name: string;
  bodyFontSize: string;   // CSS value, e.g. "11pt"
  headingFontSize: string;
  metaFontSize: string;
  gapQuestion: string;    // margin-bottom on .ex-question
  gapOption: string;      // row-gap on .ex-opts
  lineHeight: string;
}

export const PRINT_PRESETS: Record<string, PrintPreset> = {
  compact: {
    name: "Compact",
    bodyFontSize: "10pt",
    headingFontSize: "11.5pt",
    metaFontSize: "11pt",
    gapQuestion: "2.5mm",
    gapOption: "0.8mm",
    lineHeight: "1.25",
  },
  standard: {
    name: "Standard",
    bodyFontSize: "10.5pt",
    headingFontSize: "12pt",
    metaFontSize: "11.5pt",
    gapQuestion: "3.5mm",
    gapOption: "1.2mm",
    lineHeight: "1.3",
  },
  large: {
    name: "Large print",
    bodyFontSize: "12pt",
    headingFontSize: "13.5pt",
    metaFontSize: "12.5pt",
    gapQuestion: "5mm",
    gapOption: "2mm",
    lineHeight: "1.4",
  },
};

export const DEFAULT_PRESET = "standard";
