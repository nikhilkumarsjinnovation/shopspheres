'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Gift,
  ShoppingBag,
  CreditCard,
  MapPin,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';

export default function CustomerSection() {
  const [simulatedMessages, setSimulatedMessages] = useState([
    {
      sender: 'user',
      text: 'Find me hand-poured lavender candles with brass lid under ₹1,500',
    },
    {
      sender: 'agent',
      text: 'Found 2 artisan studios in Mysore. "Aromas of Malabar" offers pure soy wax with engraved brass lids at ₹1,299 (4.9★). Authorized wallet deduction ready.',
    },
  ]);

  const handleSimulatePrompt = (prompt: string, reply: string) => {
    setSimulatedMessages((prev) => [
      ...prev,
      { sender: 'user', text: prompt },
      { sender: 'agent', text: reply },
    ]);
  };

  return (
    <section
      id="customers"
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
            <Sparkles size={14} color="#10b981" />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#34d399',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              Shopper Experience
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
            What Shoppers Have on ShopSphere
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
            No more switching tabs between dozens of individual artisan shops. Enjoy autonomous AI shopping,
            photo-based gift curation, multi-store consolidated carts, and real-time milestone delivery.
          </p>
        </div>

        {/* Molded Neumorphic Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {/* Card 1: Autonomous AI Shopping Agent (Featured - 7 Cols) */}
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
                  <Compass size={24} color="#10b981" />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.85rem',
                    borderRadius: 999,
                    background: '#12151c',
                    boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.8), inset -3px -3px 6px rgba(255, 255, 255, 0.04)',
                    color: '#34d399',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  INTELLIGENT COPILOT
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
                Intelligent Shopping Copilot
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
                Tell the agent what you want in plain words. It tracks stock across boutiques, enforces your spending
                ceiling, negotiates bundle perks, and places orders with your pre-approved wallet PIN.
              </p>

              {/* Inset Deep Chat Well */}
              <div
                style={{
                  background: '#12151c',
                  boxShadow: 'inset 8px 8px 18px rgba(0, 0, 0, 0.9), inset -6px -6px 16px rgba(255, 255, 255, 0.04)',
                  borderRadius: 20,
                  padding: '1.2rem',
                  marginBottom: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                {simulatedMessages.slice(-2).map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '0.7rem 1rem',
                      borderRadius: 14,
                      background: msg.sender === 'user' ? '#10b981' : '#12151c',
                      color: msg.sender === 'user' ? '#ffffff' : '#e2e8f0',
                      boxShadow: msg.sender === 'user'
                        ? '4px 4px 12px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.1)'
                        : 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.03)',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {msg.sender === 'agent' && (
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '0.72rem', color: '#34d399', marginBottom: 2 }}>
                        ✨ ShopSphere Copilot:
                      </span>
                    )}
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Tactile Quick Prompt Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginBottom: '1.8rem' }}>
                <button
                  type="button"
                  onClick={() =>
                    handleSimulatePrompt(
                      'Find minimalist linen shirts for summer under ₹2,000',
                      'Found 3 breathable linen options from "Fabrics of Bengal". Available in Beige & Navy with next-day dispatch.'
                    )
                  }
                  className="neu-btn"
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 12,
                    fontSize: '0.76rem',
                    color: '#94a3b8',
                  }}
                >
                  💡 "Find linen shirts under ₹2,000"
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSimulatePrompt(
                      'Any handmade leather notebooks available?',
                      'Yes! "Desert Craft Guild" in Jodhpur has hand-stitched buffalo leather journals with deckle-edge cotton paper at ₹850.'
                    )
                  }
                  className="neu-btn"
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 12,
                    fontSize: '0.76rem',
                    color: '#94a3b8',
                  }}
                >
                  💡 "Handmade leather notebooks"
                </button>
              </div>
            </div>

            <Link
              href="/agent"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#34d399',
                fontSize: '0.9rem',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span>Launch Autonomous Shopping Agent</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 2: Photo-to-Gift Engine (5 Cols) */}
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
                  <Gift size={24} color="#f43f5e" />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.85rem',
                    borderRadius: 999,
                    background: '#12151c',
                    boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.8), inset -3px -3px 6px rgba(255, 255, 255, 0.04)',
                    color: '#fb7185',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  BESPOKE GIFTING
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
                Photo-to-Gift & Surprise Delivery
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
                Have an Instagram screenshot or Pinterest photo? ShopSphere matches the aesthetic across our
                curated artisan directory. Choose custom wrapping ribbons, digital wax seals, and direct friend shipping.
              </p>

              {/* Inset Visual Well */}
              <div
                style={{
                  background: '#12151c',
                  boxShadow: 'inset 6px 6px 14px rgba(0, 0, 0, 0.85), inset -5px -5px 12px rgba(255, 255, 255, 0.035)',
                  borderRadius: 20,
                  padding: '1.5rem',
                  textAlign: 'center',
                  marginBottom: '1.8rem',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎁 ➔ 💌</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fecdd3', fontFamily: 'var(--font-display)' }}>
                  Personalized Note • Silk Ribbon • Doorstep Drop
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4, fontFamily: 'var(--font-body)' }}>
                  Send surprises to friends without asking for their street address
                </div>
              </div>
            </div>

            <Link
              href="/gifts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#fb7185',
                fontSize: '0.9rem',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span>Explore Gifting Studio</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 3: Multi-Boutique Single Cart (4 Cols) */}
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
                <ShoppingBag size={22} color="#f59e0b" />
              </div>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                Multi-Boutique One Cart
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                Add items from 10 different creators. Checkout once, pay once. Our platform handles order splitting and
                coordinated fulfillment automatically.
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
              <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ✦ Zero Multi-Shipping Hassle
              </span>
            </div>
          </div>

          {/* Card 4: 1-Tap UPI & Split Bill (4 Cols) */}
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
                <CreditCard size={22} color="#06b6d4" />
              </div>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                1-Tap UPI & Split Pay
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                Instant payments with Google Pay, PhonePe, and Paytm. Group cart split links let friends contribute
                their share before dispatch.
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
              <span style={{ fontSize: '0.78rem', color: '#22d3ee', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ✦ 99.9% Zero-Bounce Guarantee
              </span>
            </div>
          </div>

          {/* Card 5: Live Milestone Radar Tracking (4 Cols) */}
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
                <MapPin size={22} color="#6c63ff" />
              </div>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                Live Milestone Radar
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                Follow your package through verified milestones: Handcrafted ➔ Studio Quality Check ➔ Transit ➔ Doorstep.
                Zero ambiguous statuses.
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
              <span style={{ fontSize: '0.78rem', color: '#8b84ff', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ✦ GPS-Accurate Delivery ETA
              </span>
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
