'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Building2, ShieldCheck, KeyRound, Check } from 'lucide-react';

const PRACTICE_OTP = '123456';
const CARD_NETWORKS = ['RuPay', 'Visa', 'Mastercard'] as const;
const BANKS = ['State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'] as const;

export default function PracticePaymentPanel({
  mode,
  amountLabel,
  onReady,
}: {
  mode: 'card' | 'netbanking';
  amountLabel: string;
  onReady: (ready: boolean) => void;
}) {
  const [network, setNetwork] = useState('RuPay');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [name, setName] = useState('Rahul Sharma');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [bank, setBank] = useState('HDFC Bank');
  const [userId, setUserId] = useState('rahul_online');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const detailsReady = mode === 'card'
    ? network !== '' && cardNumber.replace(/\s/g, '').length === 16 && name.trim().length > 1 && /^\d{2}\/\d{2}$/.test(expiry) && cvv.length === 3
    : bank !== '' && userId.trim().length >= 4;

  const verified = otpSent && otp === PRACTICE_OTP;

  useEffect(() => {
    onReady(verified);
  }, [verified, onReady]);

  return (
    <div className="payment-panel-box animate-slide-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {mode === 'card' ? <CreditCard size={18} /> : <Building2 size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            {mode === 'card' ? 'Debit / Credit Card Payment' : 'Net Banking Gateway'}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
          <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Encrypted
        </span>
      </div>

      {mode === 'card' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="auth-label">Card Network</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {CARD_NETWORKS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`variant-option-chip ${network === item ? 'selected' : ''}`}
                  onClick={() => setNetwork(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="auth-label">16-Digit Card Number</label>
            <input
              inputMode="numeric"
              className="auth-input"
              autoComplete="off"
              placeholder="4111 2222 3333 4444"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value.replace(/[^\d\s]/g, '').slice(0, 19))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="auth-label">Name on Card</label>
              <input
                className="auth-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="auth-label">Expiry (MM/YY)</label>
              <input
                className="auth-input"
                value={expiry}
                placeholder="12/28"
                onChange={(event) => setExpiry(event.target.value.slice(0, 5))}
              />
            </div>
            <div>
              <label className="auth-label">CVV</label>
              <input
                type="password"
                inputMode="numeric"
                className="auth-input"
                value={cvv}
                maxLength={3}
                onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="auth-label">Select Your Bank</label>
            <select
              className="custom-select"
              style={{ width: '100%', height: '2.85rem' }}
              value={bank}
              onChange={(event) => setBank(event.target.value)}
            >
              {BANKS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="auth-label">Net Banking Customer User ID</label>
            <input
              className="auth-input"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* OTP Verification Step */}
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
        {!otpSent ? (
          <button
            type="button"
            className="btn-card-toggle"
            style={{ width: '100%', height: '2.8rem', justifyContent: 'center' }}
            disabled={!detailsReady}
            onClick={() => { setOtpSent(true); setOtp(''); }}
          >
            <KeyRound size={15} /> Request Bank Verification OTP
          </button>
        ) : (
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.825rem', color: 'var(--fg-secondary)', marginBottom: '0.75rem' }}>
              Practice OTP sent for this payment. Enter code <strong style={{ color: 'var(--fg-primary)' }}>{PRACTICE_OTP}</strong> to authorize:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                inputMode="numeric"
                className="auth-input"
                style={{ width: '140px', letterSpacing: '0.2em', fontWeight: 700, textAlign: 'center' }}
                placeholder="123456"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="button"
                className="btn-card-toggle"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setOtp(PRACTICE_OTP)}
              >
                Auto-fill &apos;{PRACTICE_OTP}&apos;
              </button>
            </div>
            {verified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.825rem' }}>
                <Check size={16} /> OTP Verified! You can now place the order.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
