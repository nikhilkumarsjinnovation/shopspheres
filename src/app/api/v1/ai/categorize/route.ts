import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { CategoryResponseSchema, type CategoryResponse } from '@/lib/validations/ai';
import { categorizeLimiter, enforceRateLimit, rateLimitKey } from '@/lib/rate-limiter';
import { csrfMiddleware } from '@/lib/csrf';
import { ZodError } from 'zod';

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const limited = await enforceRateLimit(categorizeLimiter, await rateLimitKey(request));
    if (limited) {
      return limited;
    }

    const body = await request.json();
    const { title, description, condition } = body;

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
        const rawJsonText = await callMasterDataEntryAI(
          apiKey,
          title.trim(),
          description ? String(description).trim() : '',
          condition ? String(condition).trim() : 'New',
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

        // Defensive normalization: ensure attributes are string-string mappings
        if (parsedJson && typeof parsedJson.attributes === 'object' && parsedJson.attributes !== null) {
          for (const [key, val] of Object.entries(parsedJson.attributes)) {
            if (typeof val !== 'string') {
              parsedJson.attributes[key] = String(val);
            }
          }
        }

        // Defensive normalization: ensure suggested_price is numeric
        if (parsedJson && typeof parsedJson.suggested_price === 'string') {
          parsedJson.suggested_price = parseFloat(parsedJson.suggested_price) || 0;
        }

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

        console.warn(`[AI Data Entry Agent] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError);

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
 * Invokes Gemini LLM acting as Master E-commerce Data Entry Agent
 * Generates 10+ technical specifications and realistic suggested pricing.
 */
async function callMasterDataEntryAI(
  apiKey: string,
  title: string,
  description: string,
  condition: string,
  previousError: string | null,
  attempt: number
): Promise<string> {
  const prompt = `You are a Master E-commerce Data Entry Agent for a world-class marketplace (similar to Amazon / Flipkart).
Your task is to analyze the product title, brief description, and condition, and use your comprehensive internal catalog knowledge to enrich this product into an enterprise-grade listing.

Product Details:
- Title: "${title}"
- Brief Description: "${description || 'Standard product specifications'}"
- Item Condition: "${condition}"

Strict Instructions:
1. Deduce the appropriate top-level platform category (e.g. "Electronics", "Apparel & Accessories", "Home & Kitchen", "Health & Beauty", "Sports & Outdoors", "Books & Media", "Automotive", "Toys & Games").
2. Deduce the fine-grained sub_category (e.g. "Over-Ear Headphones", "Men's Athletic Shoes", "Espresso Machines", "Moisturizers").
3. Generate 3 to 7 relevant searchable lowercase keywords/tags.
4. Provide a confidence score between 0.0 and 1.0.
5. Provide a realistic suggested_price in INR (₹ Indian Rupees) as a number (e.g. 1499).
6. CRITICAL: Generate a comprehensive list of 10 or more technical specifications and physical attributes in the "attributes" object. Key names must be readable titles (e.g. "Brand", "Model Number", "Color", "Material", "Dimensions", "Weight", "Warranty", "Manufacturer", "Country of Origin", "Connectivity", "Power Source", "Included Components"). All values in "attributes" must be strings.

Strict Schema Requirement:
You MUST return ONLY a valid raw JSON object conforming strictly to this schema:
{
  "category": string,
  "sub_category": string,
  "tags": string[],
  "confidence": number,
  "suggested_price": number,
  "attributes": {
    "Brand": string,
    "Model": string,
    "Color": string,
    "Material": string,
    "Dimensions": string,
    "Weight": string,
    "Warranty": string,
    "Manufacturer": string,
    "Country of Origin": string,
    "Package Contents": string
    ... (and any additional category-specific specs, at least 10 in total)
  }
}

${
  previousError
    ? `IMPORTANT: Attempt ${attempt - 1} failed with this validation error: "${previousError}". Fix the issue and ensure the output strictly matches the required types.`
    : ''
}

Do NOT wrap the output in markdown code fences (no \`\`\`json). Return raw JSON only.`;

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
        temperature: 0.15,
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
