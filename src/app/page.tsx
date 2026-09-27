import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoleDashboardUrl } from '@/lib/auth/roles';

export default async function HomePage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (session) {
    redirect(getRoleDashboardUrl(session.profile.role));
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Simple Glass Navbar */}
      <header className="site-header">
        <div className="container site-header-inner">
          <Link href="/" className="brand-logo">
            <span className="brand-mark">S</span>
            <span>ShopSphere</span>
          </Link>

          <div className="header-actions">
            <Link
              href="/login"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--fg-secondary)',
                padding: '0.5rem 1rem',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-card-add"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '5rem 1.5rem 4rem',
          maxWidth: '960px',
          margin: '0 auto',
        }}
        className="animate-slide-up"
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.95rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.825rem',
            fontWeight: 600,
            color: 'var(--fg-secondary)',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--accent-electric)' }} />
          <span>Next-Generation Minimalist E-Commerce</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            marginBottom: '1.5rem',
            color: 'var(--fg-primary)',
          }}
        >
          Curated Commerce. <br />
          Seamless Shopping.
        </h1>

        <p
          style={{
            fontSize: '1.2rem',
            color: 'var(--fg-muted)',
            maxWidth: '680px',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
          }}
        >
          Discover 300+ handpicked products across 6 departments with inline modular configuration, live variant pricing, and verified Indian merchants.
        </p>

        {/* CTA Group */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/login"
            className="btn-card-add"
            style={{
              padding: '0.85rem 2rem',
              fontSize: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span>Explore Marketplace</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/signup?role=seller"
            style={{
              padding: '0.85rem 1.75rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--fg-primary)',
              boxShadow: 'var(--shadow-xs)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Become a Seller
          </Link>
        </div>

        {/* Features Highlights Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginTop: '5rem',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ color: 'var(--accent-electric)', marginBottom: '0.75rem' }}>
              <Layers size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>Modular Card Architecture</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
              Configure complex variants, capacities, and color swatches in-place without page transitions.
            </p>
          </div>

          <div
            style={{
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ color: 'var(--accent-electric)', marginBottom: '0.75rem' }}>
              <Sparkles size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>AI Shopping Guide</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
              Real-time conversational shopping assistant with custom domain personas and tailored feeds.
            </p>
          </div>

          <div
            style={{
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ color: 'var(--accent-electric)', marginBottom: '0.75rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>Inclusive Accessibility</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
              Saksham certified with high contrast, large touch targets, simplified UI, and screen reader modes.
            </p>
          </div>

          <div
            style={{
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ color: 'var(--accent-electric)', marginBottom: '0.75rem' }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>Instant UPI Checkout</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
              Frictionless checkout supporting PhonePe, Google Pay, Paytm, cards, and practice modes.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--fg-muted)',
        }}
      >
        <p>© 2026 ShopSphere India Marketplace. Built for speed, elegance, and universal accessibility.</p>
      </footer>
    </main>
  );
}
