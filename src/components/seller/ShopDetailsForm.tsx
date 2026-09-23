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
    <form onSubmit={(event) => { void save(event); }}>
      <label>Address <input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} /></label>
      <label>City <input value={city} onChange={(event) => setCity(event.target.value)} /></label>
      <label>State <input value={state} onChange={(event) => setState(event.target.value)} /></label>
      <label>PIN <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label>
      <label>Pickup radius km <input type="number" value={pickupRadiusKm} onChange={(event) => setPickupRadiusKm(Number(event.target.value))} /></label>
      <label>
        <input type="checkbox" checked={allowsBopis} onChange={(event) => setAllowsBopis(event.target.checked)} />
        Buy online, pick up in store
      </label>
      <button type="submit">Save shop details</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
