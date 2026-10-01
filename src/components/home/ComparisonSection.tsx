'use client';

import { Check, X, Sparkles } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    feature: 'Multi-Boutique Single Cart',
    description: 'Shop from 10 different independent creators in 1 seamless checkout',
    shopsphere: true,
    megastores: false,
    social: false,
  },
  {
    feature: 'Autonomous AI Shopping Agent',
    description: 'Natural language shopping copilot with budget memory & wallet authorization',
    shopsphere: true,
    megastores: false,
    social: false,
  },
  {
    feature: '3D Product & Craft Inspection',
    description: 'Rotate, inspect weave textures, and examine exact spatial dimensions',
    shopsphere: true,
    megastores: false,
    social: false,
  },
  {
    feature: 'Photo-to-Gift & Surprise Friend Delivery',
    description: 'Snap inspiration photos, add wax-seal cards, and surprise friends',
    shopsphere: true,
    megastores: false,
    social: false,
  },
  {
    feature: 'Boutique Brand Identity for Sellers',
    description: 'Full studio customization, brand narrative, and verified artisan credentials',
    shopsphere: true,
    megastores: false,
    social: true,
  },
  {
    feature: '1-Click Consolidated Logistics',
    description: 'Automated airway bills, scheduled pickups, and live milestone radar',
    shopsphere: true,
    megastores: true,
    social: false,
  },
  {
    feature: 'Transparent Commission & Daily UPI Settlements',
    description: 'Direct next-day merchant payouts with zero hidden payment processing fees',
    shopsphere: true,
    megastores: false,
    social: false,
  },
];

export default function ComparisonSection() {
  return (
    <section
      id="comparison"
      style={{
        position: 'relative',
        padding: 'clamp(5rem, 8vw, 8rem) 1.5rem',
        background: '#12151c',
        color: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
            <Sparkles size={14} color="#f59e0b" />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#fbbf24',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              The ShopSphere Advantage
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
            Why ShopSphere Outperforms the Rest
          </h2>

          <p
            style={{
              margin: '0 auto',
              maxWidth: 680,
              fontSize: 'clamp(0.95rem, 1.2vw, 1.1rem)',
              lineHeight: 1.65,
              color: '#94a3b8',
              fontFamily: 'var(--font-body)',
            }}
          >
            Megastores bury artisan brands in algorithms. Social DMs leave buyers vulnerable to ghosting and manual payments.
            ShopSphere combines sovereign brand identity with enterprise-level autonomous tech.
          </p>
        </div>

        {/* Molded Extruded Table Container */}
        <div
          className="neu-card"
          style={{
            overflow: 'hidden',
            padding: '1rem',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '1.25rem 1.5rem',
                      fontSize: '0.84rem',
                      color: '#64748b',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    CAPABILITY
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1.5rem',
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      color: '#6c63ff',
                      textAlign: 'center',
                      width: '26%',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: 12,
                        background: '#12151c',
                        boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.8), inset -3px -3px 7px rgba(255,255,255,0.04)',
                        display: 'inline-block',
                      }}
                    >
                      ✦ ShopSphere
                    </div>
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1.5rem',
                      fontSize: '0.84rem',
                      color: '#64748b',
                      textAlign: 'center',
                      width: '22%',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Megastores (Amazon/Flipkart)
                  </th>
                  <th
                    style={{
                      padding: '1.25rem 1.5rem',
                      fontSize: '0.84rem',
                      color: '#64748b',
                      textAlign: 'center',
                      width: '22%',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Social DMs (Instagram/WhatsApp)
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc', marginBottom: 2, fontFamily: 'var(--font-display)' }}>
                        {row.feature}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45, fontFamily: 'var(--font-body)' }}>
                        {row.description}
                      </div>
                    </td>

                    {/* ShopSphere Cell with Tactile Inset Well */}
                    <td
                      style={{
                        padding: '1.2rem 1.5rem',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: '#12151c',
                          boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.85), inset -2px -2px 6px rgba(255,255,255,0.04)',
                          color: '#34d399',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={16} strokeWidth={3} />
                      </div>
                    </td>

                    {/* Megastores Cell */}
                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                      {row.megastores ? (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: '#12151c',
                            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -2px -2px 5px rgba(255,255,255,0.03)',
                            color: '#94a3b8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: '#12151c',
                            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -2px -2px 5px rgba(255,255,255,0.03)',
                            color: '#f43f5e',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={14} />
                        </div>
                      )}
                    </td>

                    {/* Social DMs Cell */}
                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                      {row.social ? (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: '#12151c',
                            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -2px -2px 5px rgba(255,255,255,0.03)',
                            color: '#94a3b8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: '#12151c',
                            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -2px -2px 5px rgba(255,255,255,0.03)',
                            color: '#f43f5e',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={14} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
