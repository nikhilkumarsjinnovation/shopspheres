'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function BrandingForm({
  shop,
}: {
  shop: { name: string; description: string | null; logo_url: string | null; banner_url: string | null; branding_edits_used: number };
}) {
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description ?? '');
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? '');
  const [bannerUrl, setBannerUrl] = useState(shop.banner_url ?? '');
  const [used, setUsed] = useState(shop.branding_edits_used);
  const [message, setMessage] = useState<string | null>(null);
  const locked = used >= 2;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetchWithCsrf('/api/v1/seller/branding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, logoUrl, bannerUrl }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      setMessage(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Could not save branding.');
      return;
    }
    if (payload && typeof payload === 'object' && 'brandingEditsUsed' in payload && typeof payload.brandingEditsUsed === 'number') {
      setUsed(payload.brandingEditsUsed);
    }
    setMessage('Branding saved.');
  };

  return (
    <form onSubmit={(event) => { void save(event); }}>
      <p>{locked ? 'You have used both branding updates. Contact an admin to change this again.' : `${2 - used} branding save${2 - used === 1 ? '' : 's'} left.`}</p>
      <label>Name <input value={name} onChange={(event) => setName(event.target.value)} disabled={locked} /></label>
      <label>Description <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={locked} /></label>
      <label>Logo URL <input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} disabled={locked} /></label>
      <label>Banner URL <input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} disabled={locked} /></label>
      <button type="submit" disabled={locked}>Save branding</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
