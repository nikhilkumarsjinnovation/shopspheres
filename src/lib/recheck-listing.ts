import { fetchWithCsrf } from '@/lib/csrf-client';

export type RecheckModeration = {
  score: number;
  decision: 'approved' | 'rejected' | 'pending';
  reasons: string[];
  suggested_corrections: string[];
  model: string;
  evaluated_at: string;
  automated: boolean;
};

export async function recheckListing(productId: string): Promise<RecheckModeration> {
  const response = await fetchWithCsrf('/api/v1/seller/products/moderate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    moderation?: RecheckModeration;
  } | null;
  if (!response.ok || !payload?.moderation) {
    throw new Error(payload?.error || 'AI re-check failed.');
  }
  return payload.moderation;
}

export function recheckSummary(moderation: RecheckModeration): string {
  const lead = moderation.reasons[0] ? ` ${moderation.reasons[0]}` : '';
  if (moderation.decision === 'approved') {
    return `AI re-check approved this listing at ${moderation.score}% confidence.${lead}`;
  }
  if (moderation.decision === 'rejected') {
    return `AI re-check rejected this listing at ${moderation.score}% confidence.${lead}`;
  }
  return `AI re-check left this listing pending at ${moderation.score}% confidence (below the 90% auto-approve gate).${lead}`;
}
