'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import * as styles from '@/app/(admin)/admin.css';

export default function ResetBrandingButton({ sellerId }: { sellerId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className={styles.actionButtonGroup}>
      <button
        type="button"
        className={styles.approveBtn}
        onClick={() => {
          void fetchWithCsrf('/api/v1/admin/branding-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerId }),
          }).then((response) => setMessage(response.ok ? 'Branding edits reset.' : 'Could not reset.'));
        }}
      >
        Reset branding
      </button>
      {message ? <span style={{ fontSize: '0.75rem', color: '#8a8a8a' }}>{message}</span> : null}
    </div>
  );
}
