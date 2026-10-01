const HIDDEN_ATTRIBUTE_KEYS = new Set([
  'moderation_result',
  'rag_indexed_at',
  'rag_status',
  'previous_approval_status',
  'is_soft_deleted',
  'deleted_at',
  'restore_deadline',
]);

export type StoredModeration = {
  score: number;
  decision: 'approved' | 'rejected' | 'pending';
  reasons: string[];
  model: string | null;
};

export function readModerationResult(attributes: unknown): StoredModeration | null {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null;
  const raw = (attributes as Record<string, unknown>).moderation_result;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.score !== 'number' || !Number.isFinite(record.score)) return null;
  const rawScore = record.score;
  const score = Math.max(
    0,
    Math.min(100, Math.round(rawScore > 0 && rawScore < 1 ? rawScore * 100 : rawScore)),
  );
  const decision =
    record.decision === 'approved' || record.decision === 'rejected' || record.decision === 'pending'
      ? record.decision
      : score >= 90
        ? 'approved'
        : score < 70
          ? 'rejected'
          : 'pending';
  const reasons = Array.isArray(record.reasons)
    ? record.reasons.filter((reason): reason is string => typeof reason === 'string')
    : [];
  return {
    score,
    decision,
    reasons,
    model: typeof record.model === 'string' ? record.model : null,
  };
}

export function sellerSpecEntries(attributes: unknown): Array<[string, string]> {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return [];
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(attributes as Record<string, unknown>)) {
    if (HIDDEN_ATTRIBUTE_KEYS.has(key)) continue;
    if (value != null && typeof value === 'object') continue;
    entries.push([key, value == null ? '' : String(value)]);
  }
  return entries;
}
