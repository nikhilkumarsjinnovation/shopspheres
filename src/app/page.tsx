import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import LandingPageWrapper from '@/components/home/LandingPageWrapper';

export default async function HomePage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  const diveHref = session ? getRoleDashboardUrl(session.profile.role) : '/signup';
  const diveLabel = !session
    ? 'Create your account'
    : session.profile.role === 'customer'
      ? 'Explore ShopSphere'
      : 'Open your dashboard';

  return <LandingPageWrapper diveHref={diveHref} diveLabel={diveLabel} signedIn={Boolean(session)} />;
}
