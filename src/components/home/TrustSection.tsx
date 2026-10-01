'use client';

import { ShieldCheck, Truck, Store, Star } from 'lucide-react';

const STATS = [
  {
    icon: Store,
    value: '350+',
    label: 'Verified Independent Boutiques',
    subtext: 'Carefully vetted artisan studios and craft brands',
    accent: '#10b981',
  },
  {
    icon: ShieldCheck,
    value: '99.8%',
    label: 'Zero-Bounce UPI Settlement',
    subtext: 'Instant UPI, split payments, and wallet escrow',
    accent: '#06b6d4',
  },
  {
    icon: Truck,
    value: '48h',
    label: 'Express Consolidated Delivery',
    subtext: 'Multi-seller packages unified in one courier drop',
    accent: '#6c63ff',
  },
  {
    icon: Star,
    value: '4.9★',
    label: 'Customer Review Average',
    subtext: 'Over 42,000 satisfied shoppers and gift recipients',
    accent: '#f59e0b',
  },
];

export default function TrustSection() {
  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(4rem, 6vw, 6rem) 1.5rem',
        background: '#12151c',
        color: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.8rem',
          }}
          className="trust-grid"
        >
          {STATS.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="neu-card"
                style={{
                  padding: '2rem 1.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {/* Nested Depth: Extruded Card -> Inset Deep Icon Well */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: '#12151c',
                    boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.2rem',
                  }}
                >
                  <Icon size={26} color={stat.accent} />
                </div>
                <div
                  style={{
                    fontSize: 'clamp(2.1rem, 3vw, 2.8rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: '#f8fafc',
                    lineHeight: 1.1,
                    marginBottom: '0.45rem',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    marginBottom: '0.4rem',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    lineHeight: 1.5,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {stat.subtext}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          .trust-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 540px) {
          .trust-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
