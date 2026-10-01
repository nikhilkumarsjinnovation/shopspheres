'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingBag, Store, CheckCircle2 } from 'lucide-react';

type Props = {
  diveHref: string;
  diveLabel: string;
  signedIn: boolean;
};

export default function DualCtaSection({ diveHref, diveLabel, signedIn }: Props) {
  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(5rem, 8vw, 8rem) 1.5rem',
        background: '#12151c',
        color: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: 'clamp(2.1rem, 3.8vw, 3.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: '#f8fafc',
              fontFamily: 'var(--font-display)',
            }}
          >
            Ready to Enter the Sphere?
          </h2>
          <p
            style={{
              margin: '0 auto',
              maxWidth: 620,
              fontSize: 'clamp(0.95rem, 1.2vw, 1.1rem)',
              lineHeight: 1.6,
              color: '#94a3b8',
              fontFamily: 'var(--font-body)',
            }}
          >
            Join thousands of shoppers exploring independent craft, or launch your boutique with platform-level
            AI and logistics.
          </p>
        </div>

        {/* Dual Molded Extruded Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2.5rem',
          }}
          className="dual-cta-grid"
        >
          {/* Shopper CTA Card */}
          <div
            className="neu-card"
            style={{
              padding: 'clamp(2.2rem, 3.5vw, 3.2rem)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Nested Depth: Extruded Card -> Inset Deep Icon Well */}
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: '#12151c',
                  boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <ShoppingBag size={28} color="#10b981" />
              </div>

              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: '#34d399',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-display)',
                }}
              >
                FOR DISCERNING SHOPPERS
              </div>

              <h3
                style={{
                  margin: '0 0 1rem',
                  fontSize: 'clamp(1.5rem, 2.2vw, 2rem)',
                  fontWeight: 800,
                  color: '#f8fafc',
                  letterSpacing: '-0.025em',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Explore Curated Boutiques with AI
              </h3>

              <p
                style={{
                  margin: '0 0 1.8rem',
                  fontSize: '0.94rem',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Discover one-of-a-kind handcrafted treasures, inspect goods in spatial 3D, enjoy unified multi-vendor carts,
                and let your autonomous agent handle the shopping.
              </p>

              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#12151c',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={14} color="#10b981" />
                  </div>
                  <span>Free account with instant access to 350+ boutiques</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#12151c',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={14} color="#10b981" />
                  </div>
                  <span>Autonomous AI shopping agent with budget protection</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#12151c',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={14} color="#10b981" />
                  </div>
                  <span>1-tap UPI, split payments, and direct friend gifting</span>
                </div>
              </div>
            </div>

            <Link
              href={signedIn ? '/products' : '/signup'}
              className="neu-btn"
              style={{
                width: '100%',
                padding: '1.05rem 1.8rem',
                borderRadius: 16,
                fontSize: '0.96rem',
                fontWeight: 700,
                textDecoration: 'none',
                gap: '0.6rem',
                color: '#34d399',
                boxShadow: '6px 6px 16px rgba(0,0,0,0.7), -5px -5px 14px rgba(255,255,255,0.04)',
              }}
            >
              <span>{signedIn ? 'Explore Marketplace' : 'Start Shopping Free'}</span>
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Seller CTA Card */}
          <div
            className="neu-card"
            style={{
              padding: 'clamp(2.2rem, 3.5vw, 3.2rem)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Nested Depth: Extruded Card -> Inset Deep Icon Well */}
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: '#12151c',
                  boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <Store size={28} color="#6c63ff" />
              </div>

              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: '#8b84ff',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-display)',
                }}
              >
                FOR CREATORS & MERCHANTS
              </div>

              <h3
                style={{
                  margin: '0 0 1rem',
                  fontSize: 'clamp(1.5rem, 2.2vw, 2rem)',
                  fontWeight: 800,
                  color: '#f8fafc',
                  letterSpacing: '-0.025em',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Launch Your Boutique on ShopSphere
              </h3>

              <p
                style={{
                  margin: '0 0 1.8rem',
                  fontSize: '0.94rem',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Turn your artisanal studio into a high-growth brand. We provide AI inventory intelligence, automated
                shipping labels, courier pickups, and transparent daily bank settlements.
              </p>

              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#12151c',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={14} color="#6c63ff" />
                  </div>
                  <span>Onboard and publish your first products in under 5 minutes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#12151c',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={14} color="#6c63ff" />
                  </div>
                  <span>AI assistant writes descriptions and monitors inventory</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#12151c',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={14} color="#6c63ff" />
                  </div>
                  <span>Daily automated UPI payouts with 0% hidden deductions</span>
                </div>
              </div>
            </div>

            <Link
              href="/seller/dashboard"
              className="neu-btn-primary"
              style={{
                width: '100%',
                padding: '1.05rem 1.8rem',
                borderRadius: 16,
                fontSize: '0.96rem',
                textDecoration: 'none',
                gap: '0.6rem',
              }}
            >
              <span>{signedIn ? 'Open Seller Desk' : 'Open Your Boutique'}</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 860px) {
          .dual-cta-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
