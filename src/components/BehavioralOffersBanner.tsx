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
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '12px',
        padding: compact ? '12px 16px' : '16px 20px',
        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🏷️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#14532d' }}>
              Personalized Offers For You (Based on Your AI Browsing Behavior)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#166534' }}>
              Instant savings customized to your recent queries, cart value & festival season.
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '3px 8px',
            borderRadius: '9999px',
            textTransform: 'uppercase',
          }}
        >
          Active Now
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px',
        }}
      >
        {offers.map((offer) => (
          <div
            key={offer.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {offer.badge}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Min order: ₹{offer.minOrderAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                {offer.title}
              </strong>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                {offer.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Code:</span>
                <code
                  style={{
                    backgroundColor: '#f1f5f9',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  {offer.code}
                </code>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(offer.code, offer)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #16a34a',
                  backgroundColor: copiedCode === offer.code ? '#16a34a' : '#ffffff',
                  color: copiedCode === offer.code ? '#ffffff' : '#16a34a',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedCode === offer.code ? 'Applied ✓' : 'Apply / Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
