'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function ResetBrandingButton({ sellerId }: { sellerId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        className="btn-card-toggle"
        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
        onClick={() => {
          void fetchWithCsrf('/api/v1/admin/branding-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerId }),
          }).then((response) => setMessage(response.ok ? 'Reset done.' : 'Failed.'));
        }}
      >
        Reset branding
      </button>
      {message ? <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>{message}</span> : null}
    </div>
  );
}
