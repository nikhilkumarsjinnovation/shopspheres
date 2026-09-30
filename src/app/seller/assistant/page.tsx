import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import RagChatInterface from '@/components/rag/RagChatInterface';

export default async function SellerAssistantPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (!session || !session.profile.is_active || (session.profile.role !== 'seller' && session.profile.role !== 'admin')) {
    redirect('/login');
  }

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('seller_id', session.user.id)
    .maybeSingle();

  const shopName = shop?.name || session.profile.full_name || 'My Atelier';

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          Store Intelligence AI Copilot
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Personalized RAG embeddings over your store catalog with multi-turn memory and airtight shop isolation.
        </p>
      </div>

      <RagChatInterface role="seller" initialShopName={shopName} />
    </div>
  );
}
