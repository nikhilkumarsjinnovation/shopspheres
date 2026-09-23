'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface QueuedEvent {
  sessionId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}

const FLUSH_MS = 30_000;

function sessionId(): string {
  const key = 'shopsphere_behavior_session';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = `beh_${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(key, created);
  return created;
}

export function useBehaviorTracking(userId: string) {
  const pathname = usePathname();
  const queue = useRef<QueuedEvent[]>([]);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const push = (event: Omit<QueuedEvent, 'sessionId'>) => {
      queue.current.push({ ...event, sessionId: sessionId() });
    };

    push({
      eventType: 'view',
      entityType: 'search_result',
      entityId: userId,
      metadata: { path: pathname, source: 'page' },
    });
    startedAt.current = Date.now();

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-product-id]') : null;
      const productId = target?.getAttribute('data-product-id');
      if (!productId) return;
      push({
        eventType: 'click',
        entityType: 'product',
        entityId: productId,
        metadata: {
          category: target?.getAttribute('data-category') ?? null,
          price: Number(target?.getAttribute('data-price') ?? '') || null,
          brand: target?.getAttribute('data-brand') ?? null,
        },
      });
    };

    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const depth = height > 0 ? Math.round((window.scrollY / height) * 100) : 0;
      push({
        eventType: 'scroll',
        entityType: 'search_result',
        entityId: userId,
        metadata: { scroll_depth: depth, path: pathname },
      });
    };

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<Omit<QueuedEvent, 'sessionId'>>).detail;
      if (!detail?.entityId || !detail.eventType || !detail.entityType) return;
      push(detail);
    };

    document.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('shopsphere:track', onCustom);

    const timer = window.setInterval(() => {
      const dwell = Date.now() - startedAt.current;
      push({
        eventType: 'scroll',
        entityType: 'search_result',
        entityId: userId,
        metadata: { dwell_time_ms: dwell, path: pathname },
      });
      const batch = queue.current.splice(0, 100);
      if (batch.length === 0) return;
      void fetchWithCsrf('/api/v1/behavior/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
    }, FLUSH_MS);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('shopsphere:track', onCustom);
      window.clearInterval(timer);
    };
  }, [pathname, userId]);
}
