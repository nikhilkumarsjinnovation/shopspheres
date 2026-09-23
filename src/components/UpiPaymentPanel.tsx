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
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#5a6578',
          borderLeft: '3px solid #d6ff3a',
          paddingLeft: 8,
        }}
      >
        Choose a UPI app · practice only
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {APPS.map((name) => {
          const selected = app === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setApp(name);
                setRevealed(false);
              }}
              style={{
                padding: '12px 8px',
                borderRadius: 10,
                border: selected ? '1.5px solid #2457ff' : '1.5px solid #c5cedc',
                background: selected ? '#2457ff' : '#ffffff',
                color: selected ? '#ffffff' : '#5a6578',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                boxShadow: selected ? '0 4px 12px rgba(36, 87, 255, 0.25)' : 'none',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {app ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#07101f', fontWeight: 600 }}>
            Paying {amountLabel} with {app}.
          </p>
          <button
            type="button"
            onClick={() => {
              setRevealed(true);
              setSecondsLeft(600);
              setNonce((value) => value + 1);
            }}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1.5px solid #2457ff',
              background: '#2457ff',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Show QR
          </button>
        </div>
      ) : null}

      {revealed && app ? (
        <div
          style={{
            border: '1px solid #c5cedc',
            borderRadius: 14,
            padding: 16,
            display: 'inline-flex',
            flexDirection: 'column',
            gap: 10,
            width: 'fit-content',
            background: '#ffffff',
            boxShadow: '0 4px 16px rgba(7, 16, 31, 0.06)',
          }}
        >
          <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`UPI QR for ${amountLabel}`}>
            <rect width="132" height="132" rx="8" fill="#e8edf4" />
            {cells.map((filled, index) => (
              <rect
                key={index}
                x={(index % 11) * 12}
                y={Math.floor(index / 11) * 12}
                width="10"
                height="10"
                rx="1"
                fill={filled ? '#07101f' : '#e8edf4'}
              />
            ))}
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: '#5a6578',
            }}
          >
            Expires {minutes}:{seconds}
          </p>
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(600);
              setNonce((value) => value + 1);
            }}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #9aabbf',
              background: '#e8edf4',
              color: '#07101f',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Regenerate
          </button>
        </div>
      ) : null}
    </div>
  );
}
