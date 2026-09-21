import { NextRequest, NextResponse } from 'next/server';
import { CategoryResponseSchema, type CategoryResponse } from '@/lib/validations/ai';
import { ZodError } from 'zod';

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Product title is required for AI categorization.' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured on the server. Please select a category manually.' },
        { status: 500 }
      );
    }

    let lastError: string | null = null;

    // Retry Loop: MAX_RETRIES = 3
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const rawJsonText = await callGeminiAI(
          apiKey,
          title.trim(),
          description ? String(description).trim() : '',
          lastError,
          attempt
        );

        // Strip any markdown code fences if present
        const cleanedText = rawJsonText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        // 1. JSON parse
        const parsedJson = JSON.parse(cleanedText);

        // 2. Strict Zod schema validation
        const validated: CategoryResponse = CategoryResponseSchema.parse(parsedJson);

        // Success: return validated response
        return NextResponse.json(validated, { status: 200 });
      } catch (err: unknown) {
        if (err instanceof ZodError) {
          lastError = `Zod validation error: ${err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`;
        } else if (err instanceof SyntaxError) {
          lastError = `Invalid JSON syntax returned: ${err.message}`;
        } else if (err instanceof Error) {
          lastError = err.message;
        } else {
          lastError = 'Unknown error during AI generation or parsing.';
        }

        console.warn(`[AI Categorizer] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError);

        // If not the final attempt, brief delay before retrying
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }

    // If loop finishes after MAX_RETRIES failures: return 500 with deterministic fallback message
    return NextResponse.json(
      {
        error: 'AI categorization failed after maximum retries. Please select a category manually.',
        details: lastError,
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Invokes the Gemini API with structured JSON output instructions
 */
async function callGeminiAI(
  apiKey: string,
  title: string,
  description: string,
  previousError: string | null,
  attempt: number
): Promise<string> {
  const prompt = `You are an expert e-commerce taxonomist.
Your job is to analyze the product title and description to categorize it into standardized marketplace taxonomy.

Product Title: "${title}"
Product Description: "${description || 'None provided'}"

Strict Schema Requirement:
You MUST return ONLY a valid raw JSON object conforming strictly to this schema:
{
  "category": string (e.g. "Electronics", "Apparel & Accessories", "Home & Kitchen", "Health & Beauty", "Sports & Outdoors", "Books & Media"),
  "sub_category": string (e.g. "Headphones & Audio", "Men's Footwear", "Kitchenware", "Skincare"),
  "tags": array of strings (maximum 5 concise lowercase or title-case tags, e.g. ["wireless", "bluetooth", "noise-cancelling"]),
  "confidence": number between 0.0 and 1.0 (representing classification certainty)
}

${
  previousError
    ? `IMPORTANT: Attempt ${attempt - 1} failed with this validation error: "${previousError}". Fix the issue and ensure the JSON strictly matches the schema.`
    : ''
}

Do NOT wrap in markdown block (no \`\`\`json). Return raw JSON only.`;

  // Use gemini-3.6-flash or fallback model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('No text content returned from Gemini model candidate.');
  }

  return textContent;
}
