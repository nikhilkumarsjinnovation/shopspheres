'use client';

import { useEffect, useState } from 'react';
import { QrCode, Smartphone, RefreshCw, ShieldCheck } from 'lucide-react';

const APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'] as const;

function pattern(seed: string): boolean[] {
  let hash = 0;
  const cells: boolean[] = [];
  for (let index = 0; index < 121; index += 1) {
    hash = (hash + seed.charCodeAt(index % seed.length) * (index + 3)) % 97;
    cells.push(hash % 3 !== 0);
  }
  return cells;
}

export default function UpiPaymentPanel({ amountLabel }: { amountLabel: string }) {
  const [app, setApp] = useState<(typeof APPS)[number]>('Google Pay');
  const [revealed, setRevealed] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [revealed, nonce]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const cells = pattern(`${app}-${amountLabel}-${nonce}`);

  return (
    <div className="payment-panel-box animate-slide-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-secondary)' }}>
          Choose Instant UPI App
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>
          <ShieldCheck size={14} /> Zero Gateway Fee
        </span>
      </div>

      {/* UPI App Selection Pills */}
      <div className="upi-apps-row" role="radiogroup" aria-label="UPI Application Selection">
        {APPS.map((name) => {
          const selected = app === name;
          return (
            <button
              key={name}
              type="button"
              className={`upi-app-btn ${selected ? 'selected' : ''}`}
              onClick={() => {
                setApp(name);
                setRevealed(true);
              }}
              role="radio"
              aria-checked={selected}
            >
              <Smartphone size={15} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {/* QR Code Container */}
      <div className="upi-qr-card">
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '0.75rem' }}>
          Scan with {app} to pay {amountLabel}
        </span>

        <div style={{ background: '#ffffff', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-xs)' }}>
          <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`UPI QR code for ${amountLabel}`}>
            <rect width="132" height="132" rx="4" fill="#ffffff" />
            {cells.map((filled, index) => (
              <rect
                key={index}
                x={(index % 11) * 12}
                y={Math.floor(index / 11) * 12}
                width="10"
                height="10"
                rx="1.5"
                fill={filled ? '#09090b' : '#f4f4f5'}
              />
            ))}
          </svg>
        </div>

        <div style={{ marginTop: '0.85rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: secondsLeft < 60 ? 'var(--danger)' : 'var(--fg-primary)' }}>
            Expires in {minutes}:{seconds}
          </span>
        </div>

        <button
          type="button"
          className="btn-card-toggle"
          style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          onClick={() => {
            setSecondsLeft(600);
            setNonce((v) => v + 1);
          }}
        >
          <RefreshCw size={12} /> Regenerate QR
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '1rem' }}>
        Practice sandbox environment: Click &quot;Place Order&quot; below anytime to simulate successful instant confirmation.
      </p>
    </div>
  );
}
