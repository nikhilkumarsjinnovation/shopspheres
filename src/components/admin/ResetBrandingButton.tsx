'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function ResetBrandingButton({ sellerId }: { sellerId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void fetchWithCsrf('/api/v1/admin/branding-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerId }),
          }).then((response) => setMessage(response.ok ? 'Branding edits reset.' : 'Could not reset.'));
        }}
      >
        Reset branding edits
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
