'use client';

import React, { useState, useEffect } from 'react';
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
    <div
      style={{
        background:
          'linear-gradient(135deg, #ffffff 0%, #dce6ff 55%, #f3ffc4 100%)',
        border: '1px solid #c5cedc',
        borderRadius: 16,
        padding: compact ? '14px 16px' : '20px 22px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 24px rgba(7, 16, 31, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 22,
          bottom: 0,
          width: '28%',
          height: 4,
          background: '#d6ff3a',
          transform: 'skewX(-14deg)',
          borderRadius: 2,
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1.4fr) auto',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <div style={{ paddingLeft: 10, borderLeft: '4px solid #d6ff3a' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: 'clamp(1.15rem, 2.5vw, 1.55rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#07101f',
              lineHeight: 1,
            }}
          >
            Personalized offers
          </h3>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: '#5a6578',
              maxWidth: '36rem',
            }}
          >
            Savings matched to recent queries, cart value, and season.
          </p>
        </div>

        <span
          style={{
            justifySelf: compact ? 'start' : 'end',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            backgroundColor: '#d6ff3a',
            color: '#07101f',
            padding: '6px 12px',
            borderRadius: 999,
            transform: compact ? 'none' : 'translateY(-4px) rotate(1.5deg)',
          }}
        >
          Active now
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact
            ? '1fr'
            : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {offers.map((offer, index) => {
          const offset = compact
            ? 0
            : index % 3 === 1
              ? 14
              : index % 3 === 2
                ? -8
                : 0;
          const isCopied = copiedCode === offer.code;

          return (
            <div
              key={offer.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                border: '1px solid #c5cedc',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                boxShadow: '0 4px 16px rgba(7, 16, 31, 0.06)',
                transform: offset ? `translateY(${offset}px)` : undefined,
                transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translateY(${offset - 4}px)`;
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(36, 87, 255, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = offset
                  ? `translateY(${offset}px)`
                  : 'none';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(7, 16, 31, 0.06)';
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      backgroundColor: index % 2 === 0 ? '#2457ff' : '#07101f',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {offer.badge}
                  </span>
                  <span style={{ fontSize: 11, color: '#5a6578', fontWeight: 600 }}>
                    Min ₹{offer.minOrderAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <strong
                  style={{
                    fontFamily: 'var(--font-display), sans-serif',
                    fontSize: 15,
                    color: '#07101f',
                    display: 'block',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                  }}
                >
                  {offer.title}
                </strong>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12,
                    color: '#5a6578',
                    lineHeight: 1.45,
                  }}
                >
                  {offer.description}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingTop: 10,
                  borderTop: '1px dashed #c5cedc',
                }}
              >
                <code
                  style={{
                    backgroundColor: '#e8edf4',
                    padding: '5px 8px',
                    borderRadius: 8,
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#07101f',
                    border: '1px solid #c5cedc',
                  }}
                >
                  {offer.code}
                </code>

                <button
                  type="button"
                  onClick={() => handleCopy(offer.code, offer)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${isCopied ? '#0f7a4c' : '#2457ff'}`,
                    backgroundColor: isCopied ? '#0f7a4c' : '#2457ff',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 140ms ease',
                  }}
                >
                  {isCopied ? 'Applied' : 'Apply / Copy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
