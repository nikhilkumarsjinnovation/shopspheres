'use client';

import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer
      style={{
        background: '#12151c',
        color: '#f8fafc',
        padding: 'clamp(4rem, 6vw, 6rem) 1.5rem 3rem',
        borderTop: 'none',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2.5rem',
            marginBottom: '4rem',
          }}
          className="footer-grid"
        >
          {/* Brand Column (4 Cols) */}
          <div style={{ gridColumn: 'span 4' }} className="footer-col">
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                marginBottom: '1.2rem',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: '#12151c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.8), inset -3px -3px 8px rgba(255, 255, 255, 0.05)',
                }}
              >
                <span
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#6c63ff',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  S
                </span>
              </div>
              <span
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: '#f8fafc',
                  fontFamily: 'var(--font-display)',
                }}
              >
                ShopSphere
              </span>
            </Link>

            <p
              style={{
                margin: '0 0 1.6rem',
                fontSize: '0.88rem',
                lineHeight: 1.65,
                color: '#94a3b8',
                maxWidth: 320,
                fontFamily: 'var(--font-body)',
              }}
            >
              The premier two-sided autonomous marketplace connecting discerning shoppers with verified independent
              artisan boutiques through spatial 3D and agentic intelligence.
            </p>

            {/* Inset Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                fontSize: '0.78rem',
                color: '#34d399',
                padding: '0.45rem 0.95rem',
                borderRadius: 999,
                background: '#12151c',
                boxShadow: 'inset 3px 3px 7px rgba(0, 0, 0, 0.8), inset -2px -2px 6px rgba(255, 255, 255, 0.04)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <span>All Systems Operational • 350+ Live Stores</span>
            </div>
          </div>

          {/* Shoppers Links (3 Cols) */}
          <div style={{ gridColumn: 'span 3' }} className="footer-col">
            <h4
              style={{
                margin: '0 0 1.4rem',
                fontSize: '0.84rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: '#f8fafc',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              For Shoppers
            </h4>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <Link href="/products" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Curated Catalog
              </Link>
              <Link href="/agent" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Autonomous AI Agent
              </Link>
              <Link href="/gifts" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Photo-to-Gift Studio
              </Link>
              <Link href="/shops" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Artisan Boutiques
              </Link>
              <Link href="/orders" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Live Order Milestone Radar
              </Link>
            </div>
          </div>

          {/* Sellers Links (3 Cols) */}
          <div style={{ gridColumn: 'span 3' }} className="footer-col">
            <h4
              style={{
                margin: '0 0 1.4rem',
                fontSize: '0.84rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: '#f8fafc',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              For Merchants
            </h4>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <Link href="/seller/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Merchant Command Desk
              </Link>
              <Link href="/seller/assistant" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                AI Seller Copilot
              </Link>
              <Link href="/seller/branding" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Boutique Branding Studio
              </Link>
              <Link href="/seller/inventory" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Multi-Variant Inventory
              </Link>
              <Link href="/seller/orders" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Fulfillment & Dispatch
              </Link>
            </div>
          </div>

          {/* Spatial & Platform (2 Cols) */}
          <div style={{ gridColumn: 'span 2' }} className="footer-col">
            <h4
              style={{
                margin: '0 0 1.4rem',
                fontSize: '0.84rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: '#f8fafc',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              Platform
            </h4>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <a href="#3d-studio" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                3D Model Studio
              </a>
              <a href="#customers" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Shopper Pillars
              </a>
              <a href="#sellers" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                Seller OS
              </a>
              <a href="#comparison" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                The Advantage
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Molded Inset Bar */}
        <div
          style={{
            padding: '1.4rem 1.6rem',
            borderRadius: 20,
            background: '#12151c',
            boxShadow: 'inset 3px 3px 8px rgba(0, 0, 0, 0.8), inset -2px -2px 6px rgba(255, 255, 255, 0.035)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.82rem',
            color: '#64748b',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div>
            © {new Date().getFullYear()} ShopSphere Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span>Crafted with Dark Neumorphic Soft UI Precision</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: repeat(6, 1fr) !important;
          }
          .footer-col {
            grid-column: span 3 !important;
          }
        }
        @media (max-width: 640px) {
          .footer-col {
            grid-column: span 6 !important;
          }
        }
      `}</style>
    </footer>
  );
}
