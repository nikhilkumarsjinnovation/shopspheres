'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, Check, Copy } from 'lucide-react';
import type { BehavioralOffer } from '@/app/api/v1/offers/personalized/route';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface BehavioralOffersBannerProps {
  onApplyOffer?: (offer: BehavioralOffer) => void;
  compact?: boolean;
}

export default function BehavioralOffersBanner({
  onApplyOffer,
  compact = false,
}: BehavioralOffersBannerProps) {
  const [offers, setOffers] = useState<BehavioralOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchWithCsrf('/api/v1/offers/personalized')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.offers) {
          setOffers(data.offers);
        }
      })
      .catch((err) => console.warn('Could not load behavioral offers:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (code: string, offer: BehavioralOffer) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    onApplyOffer?.(offer);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (loading || offers.length === 0) {
    return null;
  }

  return (
    <section className="offers-banner animate-slide-up" aria-label="Personalized Behavioral Offers">
      <div className="offers-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-glow)', color: 'var(--accent-electric)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--fg-primary)' }}>
              Personalized Marketplace Offers
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              Real-time savings matched to your shopping behavior and recent searches.
            </p>
          </div>
        </div>

        <span className="section-badge">
          Live Offers ({offers.length})
        </span>
      </div>

      <div className="offers-grid">
        {offers.map((offer) => {
          const isCopied = copiedCode === offer.code;

          return (
            <div key={offer.id} className="offer-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span className="offer-badge">
                    <Tag size={12} /> {offer.badge}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Min ₹{offer.minOrderAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <strong style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: 'var(--fg-primary)', marginBottom: '0.35rem' }}>
                  {offer.title}
                </strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--fg-secondary)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                  {offer.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span className="offer-code-chip">
                  {offer.code}
                </span>

                <button
                  type="button"
                  className={`btn-apply-offer ${isCopied ? 'copied' : ''}`}
                  onClick={() => handleCopy(offer.code, offer)}
                  title="Copy coupon code"
                >
                  {isCopied ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={12} /> Applied
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Copy size={12} /> Copy Code
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
