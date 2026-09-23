import type { Json } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export interface BehaviorEventInput {
  userId: string;
  sessionId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Json;
}

export interface ComputedUserFeatures {
  category_affinity: Record<string, number>;
  price_elasticity: number;
  brand_loyalty: Record<string, number>;
  size_preference: Record<string, number>;
  delivery_urgency: 'low' | 'medium' | 'high';
  gifting_propensity: number;
  accessibility_needs: Record<string, number>;
}

export interface UserFeatures extends ComputedUserFeatures {
  userId: string;
  model_version: string;
}

const MODEL_VERSION = 'heuristic-ltr-v1';

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function readString(value: Json | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(value: Json | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

export async function getEvents(
  supabase: Db,
  userId: string,
  options: { days: number },
): Promise<Array<{ event_type: string; entity_type: string; metadata: Json | null; created_at: string }>> {
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('user_behavior_events')
    .select('event_type, entity_type, metadata, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export function computeCategoryAffinity(events: Array<{ metadata: Json | null; event_type: string }>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const event of events) {
    const category = readString(asRecord(event.metadata ?? undefined).category);
    if (!category) continue;
    const weight = event.event_type === 'add_to_cart' || event.event_type === 'checkout_complete' ? 3 : 1;
    scores[category] = (scores[category] ?? 0) + weight;
  }
  return scores;
}

export function computePriceElasticity(events: Array<{ metadata: Json | null }>): number {
  const prices = events
    .map((event) => readNumber(asRecord(event.metadata ?? undefined).price))
    .filter((price): price is number => price !== null);
  if (prices.length < 2) return 0.5;
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const spread = Math.max(...prices) - Math.min(...prices);
  return Math.min(1, spread / Math.max(average, 1));
}

export function computeBrandLoyalty(events: Array<{ metadata: Json | null }>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const event of events) {
    const brand = readString(asRecord(event.metadata ?? undefined).brand);
    if (!brand) continue;
    scores[brand] = (scores[brand] ?? 0) + 1;
  }
  return scores;
}

export function computeSizePreference(events: Array<{ metadata: Json | null }>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const event of events) {
    const size = readString(asRecord(event.metadata ?? undefined).size);
    if (!size) continue;
    scores[size] = (scores[size] ?? 0) + 1;
  }
  return scores;
}

export function computeDeliveryUrgency(events: Array<{ event_type: string }>): 'low' | 'medium' | 'high' {
  const checkouts = events.filter((event) => event.event_type === 'checkout_start' || event.event_type === 'checkout_complete').length;
  if (checkouts >= 3) return 'high';
  if (checkouts >= 1) return 'medium';
  return 'low';
}

export function computeGiftingPropensity(events: Array<{ event_type: string }>): number {
  if (events.length === 0) return 0;
  const gifts = events.filter((event) => event.event_type === 'gift_sent' || event.event_type === 'gift_revealed').length;
  return Math.min(1, gifts / events.length);
}

export function computeAccessibilityNeeds(events: Array<{ metadata: Json | null; event_type: string }>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const event of events) {
    if (event.event_type !== 'voice_command') continue;
    const feature = readString(asRecord(event.metadata ?? undefined).feature) ?? 'voice_command';
    scores[feature] = (scores[feature] ?? 0) + 1;
  }
  return scores;
}

export async function computeUserFeatures(supabase: Db, userId: string): Promise<UserFeatures> {
  const events = await getEvents(supabase, userId, { days: 30 });
  return {
    userId,
    model_version: MODEL_VERSION,
    category_affinity: computeCategoryAffinity(events),
    price_elasticity: computePriceElasticity(events),
    brand_loyalty: computeBrandLoyalty(events),
    size_preference: computeSizePreference(events),
    delivery_urgency: computeDeliveryUrgency(events),
    gifting_propensity: computeGiftingPropensity(events),
    accessibility_needs: computeAccessibilityNeeds(events),
  };
}

export async function saveUserFeatures(userId: string, features: ComputedUserFeatures): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const payload: Json = {
    category_affinity: features.category_affinity,
    price_elasticity: features.price_elasticity,
    brand_loyalty: features.brand_loyalty,
    size_preference: features.size_preference,
    delivery_urgency: features.delivery_urgency,
    gifting_propensity: features.gifting_propensity,
    accessibility_needs: features.accessibility_needs,
  };
  const { error } = await admin.from('user_features').upsert({
    user_id: userId,
    features: payload,
    model_version: MODEL_VERSION,
    computed_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function trackEvent(supabase: Db, input: BehaviorEventInput): Promise<void> {
  const { error } = await supabase.from('user_behavior_events').insert({
    user_id: input.userId,
    session_id: input.sessionId,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });
  if (error) {
    throw new Error(error.message);
  }
  const features = await computeUserFeatures(supabase, input.userId);
  await saveUserFeatures(input.userId, features);
}

export async function recomputeRecentFeatures(): Promise<number> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from('user_behavior_events')
    .select('user_id')
    .gte('created_at', since)
    .limit(500);
  if (error) {
    throw new Error(error.message);
  }
  const userIds = Array.from(new Set((rows ?? []).map((row) => row.user_id)));
  for (const userId of userIds) {
    const features = await computeUserFeatures(admin, userId);
    await saveUserFeatures(userId, features);
  }
  return userIds.length;
}

export async function getUserFeatures(supabase: Db, userId: string): Promise<UserFeatures | null> {
  const { data, error } = await supabase
    .from('user_features')
    .select('features, model_version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  const stored = asRecord(data.features);
  return {
    userId,
    model_version: data.model_version ?? MODEL_VERSION,
    category_affinity: numberMap(stored.category_affinity),
    price_elasticity: readNumber(stored.price_elasticity) ?? 0.5,
    brand_loyalty: numberMap(stored.brand_loyalty),
    size_preference: numberMap(stored.size_preference),
    delivery_urgency: stored.delivery_urgency === 'high' || stored.delivery_urgency === 'medium' ? stored.delivery_urgency : 'low',
    gifting_propensity: readNumber(stored.gifting_propensity) ?? 0,
    accessibility_needs: numberMap(stored.accessibility_needs),
  };
}

function numberMap(value: Json | undefined): Record<string, number> {
  const record = asRecord(value);
  const scores: Record<string, number> = {};
  for (const [key, score] of Object.entries(record)) {
    if (typeof score === 'number') scores[key] = score;
  }
  return scores;
}
