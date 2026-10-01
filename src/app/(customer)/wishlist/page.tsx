'use client';

import { useEffect, useState } from 'react';
import ProductCard, { type CardProduct } from '@/components/ProductCard';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface FavoriteRow {
  product: CardProduct | null;
}

export default function WishlistPage() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithCsrf('/api/v1/favorites');
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || 'Could not load wishlist.');
        }
        const rows = (body.favorites ?? []) as FavoriteRow[];
        const next = rows
          .map((row) => row.product)
          .filter((product): product is CardProduct => Boolean(product?.id))
          .map((product) => ({ ...product, description: product.description || '' }));
        if (!cancelled) setProducts(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load wishlist.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <h1 className="section-title" style={{ marginBottom: '1rem' }}>Wishlist</h1>
      {loading && <p>Loading saved products…</p>}
      {error && (
        <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
      {!loading && !error && products.length === 0 && (
        <p>Your wishlist is empty. Tap the heart on a product to save it.</p>
      )}
      {!loading && products.length > 0 && (
        <div className="product-list">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
