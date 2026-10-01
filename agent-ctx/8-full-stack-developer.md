# Task 8 — full-stack-developer

Task: Build type-aware question card + exam meta form + section manager

## Files touched
- `src/components/worksheet/question-card.tsx` (rewritten)
- `src/components/worksheet/exam-meta-form.tsx` (new)
- `src/components/worksheet/section-manager.tsx` (new)

## Approach
- Read existing `question-card.tsx`, `use-worksheet.ts`, `types.ts`, and `worksheet-details-form.tsx` for styling patterns.
- Reused the existing header row (drag handle / number badge / preview text / chevron / dropdown menu) unchanged.
- Added a "Type + Marks" row at the top of the expanded body using shadcn `Select` (driven by `QUESTION_TYPE_LABELS`) and a compact numeric `Input` for marks. Both always visible.
- Kept the existing MCQ option editor inline, just wrapped in `{q.type === "mcq" && (...)}`.
- Added three new conditional editors:
  - **trueFalse** — two large buttons (True/False) using `setCorrectOption`. Active state shows a Check icon and accent background.
  - **fillBlank** — single `Input` bound to `updateQuestionAnswer`, with helper text reminding the user to use `___` in the question text.
  - **descriptive** — `Textarea` bound to `updateQuestionAnswer`, labelled "Model Answer (optional)".
- Header answer badge now reflects the right thing per type (option label for mcq/trueFalse, snippet of `answer` for fillBlank/descriptive).
- Placeholder text on the question `Textarea` changes for `fillBlank` ("use ___ for blanks").
- Marks input calls `updateQuestionMarks(id, Number)` with `Math.max(0, …)` guard.

## New components
- `ExamMetaForm` — Card with Collapsible header (matches `WorksheetDetailsForm`).
  - Inputs: Exam Title, Grade, Subject, Max Marks, Duration, Date.
  - General Instructions: numbered list with add/remove, `max-h-96` overflow with custom scrollbar-friendly styling, `updateExamInstruction` / `addExamInstruction` / `removeExamInstruction`.
  - Mobile-first: `h-11 text-base` on mobile, `sm:h-10 sm:text-sm` on desktop (prevents iOS zoom).
- `SectionManager` — Card with Collapsible header.
  - Lists `sections`; each row has an alphabetic index badge (A, B, C…), a title `Input` (`updateSectionTitle`), a question-count badge ("3 Q"), and a remove button (`deleteSection`).
  - "Add Section" button calls `addSection("New Section")`.
  - Empty state + max-h-96 scroll list.

## Verification
- `bun run lint` — clean (no warnings, no errors).
- `dev.log` shows successful compiles + `GET / 200` after edits, no runtime errors.

## Constraints honored
- Only the 3 listed files modified.
- shadcn/ui components reused (Card, Input, Textarea, Select, Button, Label, Badge, Collapsible, DropdownMenu).
- `cn` imported from `@/lib/utils`.
- Types imported from `@/lib/worksheet/types`.
- Store hook `useWorksheetStore` from `@/hooks/use-worksheet`.
- Mobile-first design with `text-base` on mobile inputs.
- Visual style matches existing cards (navy primary, teal accent).
