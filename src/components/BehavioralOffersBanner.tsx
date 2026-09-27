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
    >
      <div
        aria-hidden
      />

      <div
      >
        <div>
          <h3
          >
            Personalized offers
          </h3>
          <p
          >
            Savings matched to recent queries, cart value, and season.
          </p>
        </div>

        <span
        >
          Active now
        </span>
      </div>

      <div
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
                >
                  <span
                  >
                    {offer.badge}
                  </span>
                  <span>
                    Min ₹{offer.minOrderAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <strong
                >
                  {offer.title}
                </strong>
                <p
                >
                  {offer.description}
                </p>
              </div>

              <div
              >
                <code
                >
                  {offer.code}
                </code>

                <button
                  type="button"
                  onClick={() => handleCopy(offer.code, offer)}
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
