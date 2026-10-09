'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Megaphone, X } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { CampaignInboxItem } from '@/app/api/v1/campaigns/inbox/route';

export default function CampaignPromoBanner() {
  const [item, setItem] = useState<CampaignInboxItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWithCsrf('/api/v1/campaigns/inbox')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { item?: CampaignInboxItem | null } | null) => {
        if (!cancelled && data?.item) {
          setItem(data.item);
        }
      })
      .catch(() => {
        /* banner is optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(
    async (action: 'open' | 'convert') => {
      if (!item || busy) return;
      setBusy(true);
      try {
        await fetchWithCsrf('/api/v1/campaigns/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sendId: item.sendId, action }),
        });
      } catch {
        /* still hide locally */
      } finally {
        setItem(null);
        setBusy(false);
      }
    },
    [item, busy],
  );

  const copyCode = useCallback(async () => {
    if (!item?.promoCode) return;
    try {
      await navigator.clipboard.writeText(item.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [item]);

  if (!item) return null;

  return (
    <div className="campaign-promo-banner animate-slide-up" role="status" aria-live="polite">
      <div className="campaign-promo-banner-inner">
        <div className="campaign-promo-icon" aria-hidden>
          <Megaphone size={18} />
        </div>
        <div className="campaign-promo-copy">
          <strong>
            {item.discountPercent}% off — {item.name}
          </strong>
          <p>
            {item.promoCode ? (
              <>
                Code <strong>{item.promoCode}</strong> — enter it at checkout, or tell the assistant “Apply {item.promoCode}”.
              </>
            ) : (
              <>A promo is waiting. Open checkout to redeem.</>
            )}
          </p>
        </div>
        <div className="campaign-promo-actions">
          {item.promoCode ? (
            <button type="button" className="campaign-promo-cta" onClick={() => void copyCode()} disabled={busy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
          ) : null}
          <Link
            href="/checkout"
            className="campaign-promo-cta"
            onClick={() => {
              void dismiss('convert');
            }}
          >
            Checkout
          </Link>
          <button
            type="button"
            className="campaign-promo-dismiss"
            aria-label="Dismiss promo"
            disabled={busy}
            onClick={() => {
              void dismiss('open');
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
