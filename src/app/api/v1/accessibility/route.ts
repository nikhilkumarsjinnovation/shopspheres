import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import type { UserAccessibilityProfileInsert } from '@/types/database.types';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ profile: null, isGuest: true });
    }

    const { data: profile, error } = await supabase
      .from('user_accessibility_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile, isGuest: false });
  } catch (err: unknown) {
    console.error('[Accessibility API GET] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch accessibility profile.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function readBool(value: unknown): boolean {
  return value === true;
}

function readMagnification(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(2.5, Math.max(1, parsed));
}

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required to save profile.' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const fields = body && typeof body === 'object' ? body as Record<string, unknown> : {};

    const upsertData: UserAccessibilityProfileInsert = {
      user_id: session.user.id,
      has_disability: readBool(fields.has_disability),
      visual_high_contrast: readBool(fields.visual_high_contrast),
      visual_font_magnification: readMagnification(fields.visual_font_magnification),
      visual_screen_reader_optimized: readBool(fields.visual_screen_reader_optimized),
      visual_audio_descriptions: readBool(fields.visual_audio_descriptions),
      motor_large_touch_targets: readBool(fields.motor_large_touch_targets),
      motor_voice_navigation: readBool(fields.motor_voice_navigation),
      motor_sticky_keys: readBool(fields.motor_sticky_keys),
      auditory_visual_alerts: readBool(fields.auditory_visual_alerts),
      auditory_text_captions: readBool(fields.auditory_text_captions),
      cognitive_simplified_ui: readBool(fields.cognitive_simplified_ui),
      cognitive_step_confirmation: readBool(fields.cognitive_step_confirmation),
      special_signin_enabled: readBool(fields.special_signin_enabled),
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error } = await supabase
      .from('user_accessibility_profiles')
      .upsert(upsertData)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    console.error('[Accessibility API POST] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to update accessibility profile.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
