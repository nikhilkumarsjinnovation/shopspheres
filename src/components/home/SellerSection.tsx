'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  BrainCircuit,
  Store,
  Boxes,
  Coins,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function SellerSection() {
  return (
    <section
      id="sellers"
      style={{
        position: 'relative',
        padding: 'clamp(5rem, 8vw, 8rem) 1.5rem',
        background: '#12151c',
        color: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          {/* Neumorphic Inset Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.1rem',
              borderRadius: 999,
              background: '#12151c',
              boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.8), inset -3px -3px 8px rgba(255,255,255,0.04)',
              marginBottom: '1.2rem',
            }}
          >
            <Store size={14} color="#6c63ff" />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#8b84ff',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              Merchant Operating System
            </span>
          </div>

          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: '#f8fafc',
              fontFamily: 'var(--font-display)',
            }}
          >
            What Sellers Have on ShopSphere
          </h2>

          <p
            style={{
              margin: '0 auto',
              maxWidth: 700,
              fontSize: 'clamp(0.95rem, 1.2vw, 1.1rem)',
              lineHeight: 1.65,
              color: '#94a3b8',
              fontFamily: 'var(--font-body)',
            }}
          >
            Everything an independent artisan, boutique creator, or growing brand needs to run operations like an
            enterprise — without the technical overhead.
          </p>
        </div>

        {/* Bento Grid for Sellers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {/* Card 1: Merchant Command Desk (Featured - 7 Cols) */}
          <div
            className="neu-card"
            style={{
              gridColumn: 'span 7',
              padding: 'clamp(1.8rem, 2.5vw, 2.4rem)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Nested Depth: Extruded Card -> Inset Deep Icon Well */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: '#12151c',
                    boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LayoutDashboard size={24} color="#6c63ff" />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.85rem',
                    borderRadius: 999,
                    background: '#12151c',
                    boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.8), inset -3px -3px 6px rgba(255, 255, 255, 0.04)',
                    color: '#8b84ff',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  SELLER DESK
                </span>
              </div>

              <h3
                style={{
                  margin: '0 0 0.8rem',
                  fontSize: 'clamp(1.3rem, 1.8vw, 1.65rem)',
                  fontWeight: 800,
                  color: '#f8fafc',
                  fontFamily: 'var(--font-display)',
                }}
              >
                The Merchant Command Center
              </h3>

              <p
                style={{
                  margin: '0 0 1.6rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Track live orders, monitor gross sales, inspect real-time profit margins, and forecast demand spikes
                from a centralized, clean dashboard built specifically for creators and retail merchants.
              </p>

              {/* Inset Metric Wells */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1.8rem',
                }}
              >
                <div
                  style={{
                    background: '#12151c',
                    borderRadius: 18,
                    padding: '1rem',
                    boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 4, fontFamily: 'var(--font-body)' }}>
                    Today's Gross
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-display)' }}>
                    ₹38,450
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: 3 }}>↑ 24% vs yesterday</div>
                </div>

                <div
                  style={{
                    background: '#12151c',
                    borderRadius: 18,
                    padding: '1rem',
                    boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 4, fontFamily: 'var(--font-body)' }}>
                    Pending Dispatch
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-display)' }}>
                    14 Orders
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: 3 }}>Auto-pickup ready</div>
                </div>

                <div
                  style={{
                    background: '#12151c',
                    borderRadius: 18,
                    padding: '1rem',
                    boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 4, fontFamily: 'var(--font-body)' }}>
                    Next Payout
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
                    ₹1,42,800
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginTop: 3 }}>Automated UPI settling</div>
                </div>
              </div>
            </div>

            <Link
              href="/seller/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#8b84ff',
                fontSize: '0.9rem',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span>Explore Seller Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 2: AI Seller Copilot (5 Cols) */}
          <div
            className="neu-card"
            style={{
              gridColumn: 'span 5',
              padding: 'clamp(1.8rem, 2.5vw, 2.4rem)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: '#12151c',
                    boxShadow: 'inset 5px 5px 12px rgba(0, 0, 0, 0.85), inset -4px -4px 10px rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BrainCircuit size={24} color="#14b8a6" />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.85rem',
                    borderRadius: 999,
                    background: '#12151c',
                    boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.8), inset -3px -3px 6px rgba(255, 255, 255, 0.04)',
                    color: '#5eead4',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  AI MERCHANT COPILOT
                </span>
              </div>

              <h3
                style={{
                  margin: '0 0 0.8rem',
                  fontSize: 'clamp(1.3rem, 1.8vw, 1.65rem)',
                  fontWeight: 800,
                  color: '#f8fafc',
                  fontFamily: 'var(--font-display)',
                }}
              >
                AI Assistant & Restock Brain
              </h3>

              <p
                style={{
                  margin: '0 0 1.6rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Never run out of raw materials or best-selling SKUs. ShopSphere’s merchant copilot writes high-converting
                product descriptions, auto-generates SEO tags, and forecasts restock alerts before you stock out.
              </p>

              {/* Inset Copilot Feature Pills */}
              <div style={{ display: 'grid', gap: '0.85rem', marginBottom: '1.8rem' }}>
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 16,
                    background: '#12151c',
                    boxShadow: 'inset 4px 4px 10px rgba(0, 0, 0, 0.85), inset -3px -3px 8px rgba(255, 255, 255, 0.03)',
                    fontSize: '0.84rem',
                    color: '#ccfbf1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span>✨</span>
                  <span>1-Click AI Product Description & Tag Generator</span>
                </div>
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 16,
                    background: '#12151c',
                    boxShadow: 'inset 4px 4px 10px rgba(0, 0, 0, 0.85), inset -3px -3px 8px rgba(255, 255, 255, 0.03)',
                    fontSize: '0.84rem',
                    color: '#ccfbf1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span>📊</span>
                  <span>Predictive Stock-Out Warning System</span>
                </div>
              </div>
            </div>

            <Link
              href="/seller/assistant"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#5eead4',
                fontSize: '0.9rem',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span>Test Seller Assistant</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 3: Boutique Storefront Branding (4 Cols) */}
          <div
            className="neu-card"
            style={{
              gridColumn: 'span 4',
              padding: '1.8rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: '#12151c',
                  boxShadow: 'inset 4px 4px 10px rgba(0, 0, 0, 0.85), inset -3px -3px 8px rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.2rem',
                }}
              >
                <Store size={22} color="#f43f5e" />
              </div>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                Boutique Branding Studio
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                Your brand, your identity. Customize banners, studio story, craft certifications, and curate featured
                seasonal showcases for your followers.
              </p>
            </div>
            <div
              style={{
                marginTop: '1.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: 12,
                background: '#12151c',
                boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.03)',
              }}
            >
              <Link
                href="/seller/branding"
                style={{ color: '#fb7185', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-display)' }}
              >
                Manage Brand Identity →
              </Link>
            </div>
          </div>

          {/* Card 4: Multi-Variant Inventory (4 Cols) */}
          <div
            className="neu-card"
            style={{
              gridColumn: 'span 4',
              padding: '1.8rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: '#12151c',
                  boxShadow: 'inset 4px 4px 10px rgba(0, 0, 0, 0.85), inset -3px -3px 8px rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.2rem',
                }}
              >
                <Boxes size={22} color="#10b981" />
              </div>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                Multi-Variant Inventory
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                Manage matrix variants (size, finish, color) with ease. Batch price updates, barcode SKUs, and
                instant low-stock alerts.
              </p>
            </div>
            <div
              style={{
                marginTop: '1.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: 12,
                background: '#12151c',
                boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.03)',
              }}
            >
              <Link
                href="/seller/inventory"
                style={{ color: '#34d399', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-display)' }}
              >
                View Inventory System →
              </Link>
            </div>
          </div>

          {/* Card 5: 1-Click Dispatch & Settlements (4 Cols) */}
          <div
            className="neu-card"
            style={{
              gridColumn: 'span 4',
              padding: '1.8rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: '#12151c',
                  boxShadow: 'inset 4px 4px 10px rgba(0, 0, 0, 0.85), inset -3px -3px 8px rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.2rem',
                }}
              >
                <Coins size={22} color="#f59e0b" />
              </div>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                Automated UPI Settlements
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                Transparent low commissions with zero payment gateway markups. Daily automated settlements directly
                deposited into your bank via UPI/NEFT.
              </p>
            </div>
            <div
              style={{
                marginTop: '1.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: 12,
                background: '#12151c',
                boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.03)',
              }}
            >
              <Link
                href="/seller/orders"
                style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-display)' }}
              >
                Order Fulfillment Flow →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .neu-card {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </section>
  );
}
