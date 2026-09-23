'use client';

import { useEffect, useState } from 'react';

const PRACTICE_OTP = '123456';
const CARD_NETWORKS = ['RuPay', 'Visa', 'Mastercard'] as const;
const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Punjab National Bank'] as const;

export default function PracticePaymentPanel({
  mode,
  amountLabel,
  onReady,
}: {
  mode: 'card' | 'netbanking';
  amountLabel: string;
  onReady: (ready: boolean) => void;
}) {
  const [network, setNetwork] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [bank, setBank] = useState('');
  const [userId, setUserId] = useState('');
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
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
        Practice payment for {amountLabel}. Nothing is charged.
      </p>
      {mode === 'card' ? (
        <>
          <label>
            Card network
            <select value={network} onChange={(event) => setNetwork(event.target.value)}>
              <option value="">Choose</option>
              {CARD_NETWORKS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Card number
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder="4111 1111 1111 1111"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value.replace(/[^\d\s]/g, '').slice(0, 19))}
            />
          </label>
          <label>
            Name on card
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          </label>
          <label>
            Expiry (MM/YY)
            <input value={expiry} placeholder="12/28" onChange={(event) => setExpiry(event.target.value.slice(0, 5))} />
          </label>
          <label>
            CVV
            <input inputMode="numeric" value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 3))} />
          </label>
        </>
      ) : (
        <>
          <label>
            Bank
            <select value={bank} onChange={(event) => setBank(event.target.value)}>
              <option value="">Choose a bank</option>
              {BANKS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Net banking user id
            <input value={userId} onChange={(event) => setUserId(event.target.value)} autoComplete="off" />
          </label>
        </>
      )}
      <button
        type="button"
        disabled={!detailsReady}
        onClick={() => { setOtpSent(true); setOtp(''); }}
      >
        Send practice OTP
      </button>
      {otpSent ? (
        <div>
          <p style={{ margin: '0 0 6px', fontSize: '13px' }}>
            Practice OTP for this {mode === 'card' ? `${network} card` : bank} payment is {PRACTICE_OTP}. Enter it to continue.
          </p>
          <label>
            OTP
            <input inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
          {verified ? <p role="status">OTP matched. You can place the order.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
