import type { Json } from '@/types/database.types';

export type PendingResult = {
  ok: false;
  error: 'pending_phase_1_migration';
};

export interface BehaviorEventInput {
  userId: string;
  sessionId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Json;
}

export interface UserFeatures {
  userId: string;
  topCategories: string[];
  recentEventCount: number;
}

const pending = (): PendingResult => ({ ok: false, error: 'pending_phase_1_migration' });

/** user_behavior_events is specified in database-schema.md and is not in database.types.ts yet. */
export async function trackEvent(_input: BehaviorEventInput): Promise<PendingResult> {
  return pending();
}

export async function computeFeatures(userId: string): Promise<UserFeatures> {
  return { userId, topCategories: [], recentEventCount: 0 };
}

export async function getUserFeatures(userId: string): Promise<UserFeatures> {
  return computeFeatures(userId);
}
