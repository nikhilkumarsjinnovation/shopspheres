/**
 * Shared agent guardrails: PII redaction, JSON schema checks, low-confidence refuse.
 */

import type { ZodType } from 'zod';

export const SUPERVISOR_CONFIDENCE_FLOOR = 0.7;

export type GuardrailRefuse = {
  refused: true;
  reply: string;
  provenance: {
    verifiedAt: string;
    source: string;
    rowCount: number;
    confidence: 'qualified';
  };
};

export type JsonSchemaOk<T> = { ok: true; data: T };
export type JsonSchemaFail = { ok: false; refuse: GuardrailRefuse };

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

export function redactPii(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(PHONE_RE, '[REDACTED_PHONE]');
}

function refuse(reply: string, source: string): GuardrailRefuse {
  return {
    refused: true,
    reply,
    provenance: {
      verifiedAt: new Date().toISOString(),
      source,
      rowCount: 0,
      confidence: 'qualified',
    },
  };
}

export function refuseIfLowConfidence(
  confidence: number,
  min: number = SUPERVISOR_CONFIDENCE_FLOOR,
): GuardrailRefuse | null {
  if (confidence >= min) return null;
  return refuse(
    `I am not confident enough to route or act on that request (confidence ${confidence.toFixed(2)} < ${min}). Please rephrase with a clearer goal — for example a shopping task, or an admin campaign to a specific segment.`,
    'ShopSphere Agent Guardrails (Low Confidence)',
  );
}

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export function assertJsonSchema<T>(
  schema: ZodType<T>,
  raw: string,
): JsonSchemaOk<T> | JsonSchemaFail {
  let parsed: unknown;
  try {
    parsed = extractJsonPayload(raw);
  } catch {
    return {
      ok: false,
      refuse: refuse(
        'I could not parse a valid JSON action from the model output. Please retry with a clearer campaign request.',
        'ShopSphere Agent Guardrails (Schema Check)',
      ),
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      refuse: refuse(
        `Marketing action failed schema validation: ${result.error.issues.map((i) => i.message).join('; ')}`,
        'ShopSphere Agent Guardrails (Schema Check)',
      ),
    };
  }

  return { ok: true, data: result.data };
}

export function guardrailRefuseToOutput(refuseResult: GuardrailRefuse): {
  reply: string;
  recommendedProductIds: string[];
  extractedIntents: { category: null; keywords: string[]; priceMax: null };
  provenance: GuardrailRefuse['provenance'];
  needsClarification: boolean;
} {
  return {
    reply: refuseResult.reply,
    recommendedProductIds: [],
    extractedIntents: { category: null, keywords: [], priceMax: null },
    provenance: refuseResult.provenance,
    needsClarification: true,
  };
}
