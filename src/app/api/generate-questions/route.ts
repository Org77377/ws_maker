import { NextRequest, NextResponse } from "next/server";

// AI-powered question generation.
// Takes plain text (chapter notes, a paragraph, a topic) and uses the LLM to
// generate properly formatted questions ready to paste into the worksheet
// question textarea and parse.
//
// Output format (matching the parser's expected syntax):
//   M1. Question text
//   A. Option
//   B. Option *
//   C. Option
//   D. Option
//
//   T2. True/False statement.
//
//   F3. The sky is ___ ~ blue
//
//   D4. Descriptive question text

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GenerateQuestionsBody {
  text: string;
  count?: number;
  questionType?: "mcq" | "trueFalse" | "fillBlank" | "descriptive" | "mixed";
  difficulty?: "easy" | "medium" | "hard";
  grade?: string;
  subject?: string;
}

const SYSTEM_PROMPT = `You are an expert educational content creator who generates well-structured school worksheet questions.

You output questions in a SPECIFIC PLAIN-TEXT FORMAT that the Worksheet Maker app parses automatically. You must follow this format EXACTLY.

FORMAT RULES:
1. Each question starts with a type prefix + number:
   - M1. / M2. ... for Multiple Choice (MCQ)
   - T1. / T2. ... for True/False
   - F1. / F2. ... for Fill in the Blanks
   - D1. / D2. ... for Descriptive (long answer)
2. MCQ options follow on new lines:
   A. First option
   B. Second option *
   C. Third option
   D. Fourth option
   - The CORRECT answer MUST be marked with a trailing asterisk (*) AFTER the option text.
   - Exactly one option is correct.
3. True/False: just the question line (no options needed, the app adds True/False).
   T1. The CPU is the brain of the computer.
4. Fill in the Blanks: use ___ for the blank, then ~ answer:
   F1. The sky is ___ ~ blue
5. Descriptive: just the question line.
   D1. Explain the water cycle with a diagram.
6. Leave a blank line between questions.
7. Do NOT add any commentary, headers, or explanations — ONLY the formatted questions.
8. Number questions sequentially starting from 1.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateQuestionsBody;
    const {
      text,
      count = 10,
      questionType = "mixed",
      difficulty = "medium",
      grade = "",
      subject = "",
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Please provide some text to generate questions from." },
        { status: 400 },
      );
    }

    // Build the type instruction
    let typeInstruction: string;
    switch (questionType) {
      case "mcq":
        typeInstruction = `Generate exactly ${count} multiple-choice questions (use the M prefix). Each MCQ must have 4 options (A-D) with exactly one correct answer marked with *.`;
        break;
      case "trueFalse":
        typeInstruction = `Generate exactly ${count} true/false questions (use the T prefix). These are statements that are either true or false.`;
        break;
      case "fillBlank":
        typeInstruction = `Generate exactly ${count} fill-in-the-blank questions (use the F prefix). Include the answer after ~.`;
        break;
      case "descriptive":
        typeInstruction = `Generate exactly ${count} descriptive/long-answer questions (use the D prefix).`;
        break;
      case "mixed":
      default:
        typeInstruction = `Generate exactly ${count} questions of MIXED types: some MCQ (M prefix with 4 options + correct marked with *), some True/False (T prefix), some Fill-in-the-blank (F prefix with ~ answer), and some Descriptive (D prefix). Aim for a balanced mix.`;
        break;
    }

    const userPrompt = `Source text/content:
"""
${text.trim()}
"""

Task: ${typeInstruction}

Difficulty: ${difficulty}
${grade ? `Target grade: ${grade}` : ""}
${subject ? `Subject: ${subject}` : ""}

Generate the questions now in the exact format specified. Remember: mark the correct MCQ answer with a trailing *, use ___ for blanks with ~ answer, and number sequentially. Output ONLY the questions, nothing else.`;

    // Use the z-ai-web-dev-sdk LLM
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const generated = completion.choices[0]?.message?.content?.trim();

    if (!generated) {
      return NextResponse.json(
        { error: "The AI did not generate any questions. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ questions: generated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-questions] error:", message);
    return NextResponse.json(
      { error: "Question generation failed.", detail: message },
      { status: 500 },
    );
  }
}
