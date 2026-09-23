'use client';

import { useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function AudioDescriptionPlayer({ productId }: { productId: string }) {
  const [script, setScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWithCsrf(`/api/v1/ai/generate-audio-description?product_id=${encodeURIComponent(productId)}`)
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!active || !response.ok || !payload || typeof payload !== 'object' || !('description' in payload)) {
          return;
        }
        const description = payload.description;
        if (!description || typeof description !== 'object') return;
        if ('script' in description && typeof description.script === 'string') setScript(description.script);
        if ('audio_url' in description && typeof description.audio_url === 'string') setAudioUrl(description.audio_url);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load audio description.');
      });
    return () => {
      active = false;
    };
  }, [productId]);

  if (!script && !audioUrl && !error) {
    return null;
  }

  return (
    <section aria-label="Audio description">
      {audioUrl ? <audio controls src={audioUrl} /> : null}
      {script ? <p>{script}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
