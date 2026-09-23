import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { trackEvent } from '@/services/behavior-service';
import type { Json } from '@/types/database.types';

const EventSchema = z.object({
  sessionId: z.string().min(1).max(200),
  eventType: z.string().min(1).max(80),
  entityType: z.string().min(1).max(80),
  entityId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
});

const BatchSchema = z.object({
  events: z.array(EventSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const parsed = BatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid events payload', details: parsed.error.flatten() }, { status: 400 });
    }

    let accepted = 0;
    let failed = 0;
    for (const event of parsed.data.events) {
      try {
        await trackEvent(supabase, {
          userId: session.user.id,
          sessionId: event.sessionId,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: (event.metadata ?? {}) as Json,
        });
        accepted += 1;
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({ accepted, failed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to store events.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
