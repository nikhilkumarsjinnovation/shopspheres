'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface VisualResult {
  id: string;
  title: string;
  price: number;
  category: string;
  confidence: number;
}

export default function VisualSearch() {
  const [results, setResults] = useState<VisualResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('image', file);
      const response = await fetchWithCsrf('/api/v1/ai/visual-search', { method: 'POST', body });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'Visual search failed.';
        throw new Error(message);
      }
      const rows = payload && typeof payload === 'object' && 'results' in payload && Array.isArray(payload.results)
        ? payload.results
        : [];
      setResults(rows.filter((row): row is VisualResult => {
        return Boolean(row) && typeof row === 'object' && 'id' in row && 'title' in row;
      }));
    } catch (searchError: unknown) {
      setError(searchError instanceof Error ? searchError.message : 'Visual search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="Visual search">
      <label>
        Search by photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            void search(event.target.files?.[0] ?? null);
          }}
        />
      </label>
      {loading ? <p>Looking through the catalog…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {results.map((result) => (
          <li key={result.id}>
            {result.title} · ₹{result.price} · {Math.round(result.confidence * 100)}%
          </li>
        ))}
      </ul>
    </section>
  );
}
