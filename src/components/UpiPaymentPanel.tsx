'use client';

import { useEffect, useState } from 'react';

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
  const [app, setApp] = useState<(typeof APPS)[number] | null>(null);
  const [revealed, setRevealed] = useState(false);
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
  const cells = pattern(`${app ?? 'upi'}-${amountLabel}-${nonce}`);

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>Choose a UPI app. This is a practice step. No app is opened.</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {APPS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => { setApp(name); setRevealed(false); }}
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              border: app === name ? '2px solid #059669' : '1px solid #cbd5e1',
              background: app === name ? '#ecfdf5' : '#fff',
              cursor: 'pointer',
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {app ? (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '13px' }}>Paying {amountLabel} with {app}.</p>
          <button type="button" onClick={() => { setRevealed(true); setSecondsLeft(600); setNonce((value) => value + 1); }}>
            Show QR code
          </button>
        </div>
      ) : null}
      {revealed && app ? (
        <div>
          <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`UPI QR for ${amountLabel}`}>
            <rect width="132" height="132" fill="#fff" />
            {cells.map((filled, index) => (
              <rect
                key={index}
                x={(index % 11) * 12}
                y={Math.floor(index / 11) * 12}
                width="10"
                height="10"
                fill={filled ? '#0f172a' : '#fff'}
              />
            ))}
          </svg>
          <p style={{ margin: '8px 0', fontSize: '13px' }}>QR expires in {minutes}:{seconds}</p>
          <button
            type="button"
            onClick={() => { setSecondsLeft(600); setNonce((value) => value + 1); }}
          >
            Regenerate QR code
          </button>
        </div>
      ) : null}
    </div>
  );
}
