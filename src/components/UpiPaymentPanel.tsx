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
    <div>
      <p
      >
        Choose a UPI app · practice only
      </p>

      <div
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
            >
              {name}
            </button>
          );
        })}
      </div>

      {app ? (
        <div>
          <p>
            Paying {amountLabel} with {app}.
          </p>
          <button
            type="button"
            onClick={() => {
              setRevealed(true);
              setSecondsLeft(600);
              setNonce((value) => value + 1);
            }}
          >
            Show QR
          </button>
        </div>
      ) : null}

      {revealed && app ? (
        <div
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
          >
            Expires {minutes}:{seconds}
          </p>
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(600);
              setNonce((value) => value + 1);
            }}
          >
            Regenerate
          </button>
        </div>
      ) : null}
    </div>
  );
}
