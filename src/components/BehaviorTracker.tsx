'use client';

import { useBehaviorTracking } from '@/hooks/use-behavior-tracking';

export default function BehaviorTracker({ userId }: { userId: string }) {
  useBehaviorTracking(userId);
  return null;
}
