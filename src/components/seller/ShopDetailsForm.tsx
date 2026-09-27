'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function ShopDetailsForm({
  shop,
}: {
  shop: {
    address_line: string;
    city: string;
    state: string;
    postal_code: string;
    pickup_radius_km: number;
    allows_bopis: boolean;
  };
}) {
  const [addressLine, setAddressLine] = useState(shop.address_line);
  const [city, setCity] = useState(shop.city);
  const [state, setState] = useState(shop.state);
  const [postalCode, setPostalCode] = useState(shop.postal_code);
  const [pickupRadiusKm, setPickupRadiusKm] = useState(shop.pickup_radius_km);
  const [allowsBopis, setAllowsBopis] = useState(shop.allows_bopis);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetchWithCsrf('/api/v1/seller/shop', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressLine, city, state, postalCode, pickupRadiusKm, allowsBopis }),
    });
    setMessage(response.ok ? 'Shop details saved. This does not use a branding edit.' : 'Could not save shop details.');
  };

  return (
    <form onSubmit={(event) => { void save(event); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.25rem' }}>
        Address and pickup settings can be changed anytime without consuming your branding edit quota.
      </p>

      <div>
        <label className="auth-label">Street Address</label>
        <input className="auth-input" value={addressLine} onChange={(event) => setAddressLine(event.target.value)} required />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div>
          <label className="auth-label">City</label>
          <input className="auth-input" value={city} onChange={(event) => setCity(event.target.value)} required />
        </div>
        <div>
          <label className="auth-label">State</label>
          <input className="auth-input" value={state} onChange={(event) => setState(event.target.value)} required />
        </div>
        <div>
          <label className="auth-label">PIN Code</label>
          <input className="auth-input" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} required />
        </div>
      </div>

      <div>
        <label className="auth-label">Pickup Radius (km)</label>
        <input className="auth-input" type="number" min="0" max="100" value={pickupRadiusKm} onChange={(event) => setPickupRadiusKm(Number(event.target.value))} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <input
          type="checkbox"
          id="allows-bopis"
          checked={allowsBopis}
          onChange={(event) => setAllowsBopis(event.target.checked)}
          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-electric)', cursor: 'pointer' }}
        />
        <label htmlFor="allows-bopis" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
          Enable Click & Collect (Buy Online, Pick Up In Store)
        </label>
      </div>

      <button type="submit" className="btn-card-add" style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        Save Shop Details
      </button>

      {message ? (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: message.includes('saved') ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.includes('saved') ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${message.includes('saved') ? 'var(--success-border)' : 'var(--danger)'}`,
          }}
        >
          {message}
        </div>
      ) : null}
    </form>
  );
}
