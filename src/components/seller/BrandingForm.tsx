'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { Save, AlertCircle, Check } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const locked = used >= 2;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
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
      setMessage('Branding updated successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => { void save(event); }} className="checkout-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', color: 'var(--fg-secondary)' }}>
        {locked ? (
          <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
            🔒 You have reached the limit of 2 branding updates. Contact marketplace administration to request changes.
          </span>
        ) : (
          <span>
            Notice: Sellers are allocated 2 self-service branding updates. You have <strong style={{ color: 'var(--fg-primary)' }}>{2 - used} branding save{2 - used === 1 ? '' : 's'} remaining</strong>.
          </span>
        )}
      </div>

      <div className="auth-form-group" style={{ marginBottom: 0 }}>
        <label className="auth-label">Shop / Storefront Name</label>
        <input
          type="text"
          className="auth-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={locked}
          required
        />
      </div>

      <div className="auth-form-group" style={{ marginBottom: 0 }}>
        <label className="auth-label">Shop Description / Tagline</label>
        <textarea
          rows={3}
          className="auth-input"
          style={{ height: 'auto', padding: '0.75rem 1rem' }}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={locked}
          placeholder="Describe your craft, merchandise, and origin across India..."
        />
      </div>

      <div className="auth-form-group" style={{ marginBottom: 0 }}>
        <label className="auth-label">Logo Image URL</label>
        <input
          type="url"
          className="auth-input"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          disabled={locked}
          placeholder="https://images.unsplash.com/..."
        />
        {logoUrl && (
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo preview" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Logo asset preview</span>
          </div>
        )}
      </div>

      <div className="auth-form-group" style={{ marginBottom: 0 }}>
        <label className="auth-label">Storefront Banner Image URL</label>
        <input
          type="url"
          className="auth-input"
          value={bannerUrl}
          onChange={(event) => setBannerUrl(event.target.value)}
          disabled={locked}
          placeholder="https://images.unsplash.com/..."
        />
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', background: message.includes('successfully') ? 'var(--success-bg)' : 'var(--danger-bg)', color: message.includes('successfully') ? 'var(--success)' : 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div>
        <button
          type="submit"
          className="btn-card-add"
          style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          disabled={locked || saving}
        >
          <Save size={15} />
          <span>{saving ? 'Saving Branding…' : 'Save Branding Changes'}</span>
        </button>
      </div>
    </form>
  );
}
