import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import RagChatInterface from '@/components/rag/RagChatInterface';

export default async function AdminAssistantPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (!session || !session.profile.is_active || session.profile.role !== 'admin') {
    redirect('/login');
  }

  // Load shops list for admin scope switcher
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name')
    .order('name', { ascending: true });

  const adminShops = (shops || []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          Platform RAG Intelligence & Moderation
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Platform-wide RAG embeddings and store Q&amp;A. This page does not schedule email campaigns —
          use Admin → Email Campaigns → Marketing AI agent for that.
        </p>
      </div>

      <RagChatInterface role="admin" adminShops={adminShops} />
    </div>
  );
}
