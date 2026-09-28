import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserBehavioralProfile } from '@/services/agent-memory-service';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    const userId = session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getUserBehavioralProfile(userId);

    // Fetch latest conversation messages (last 20)
    const { data: turns } = await supabase
      .from('ai_conversations')
      .select('id, role, content, session_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversations = (turns || []).reverse();

    return NextResponse.json({
      profile,
      conversations,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch agent profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
