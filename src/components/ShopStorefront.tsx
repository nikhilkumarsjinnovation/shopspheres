'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Store } from 'lucide-react';
import ProductCard, { type CardProduct } from '@/components/ProductCard';

export interface ShopView {
  id: string;
  name: string;
  city: string;
  state: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number;
  is_verified: boolean;
}

export interface ShopReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
}

const tabs = ['Home', 'Products', 'Categories', 'Reviews'] as const;

export default function ShopStorefront({
  shop,
  products,
  reviews,
}: {
  shop: ShopView;
  products: CardProduct[];
  reviews: ShopReview[];
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Home');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    setFollowing(window.localStorage.getItem(`shopsphere-follow:${shop.id}`) === '1');
  }, [shop.id]);

  const categories = useMemo(() => {
    const groups = new Map<string, CardProduct[]>();
    for (const product of products) {
      const key = product.category || 'Other';
      const list = groups.get(key) ?? [];
      list.push(product);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [products]);

  const toggleFollow = () => {
    const next = !following;
    setFollowing(next);
    window.localStorage.setItem(`shopsphere-follow:${shop.id}`, next ? '1' : '0');
  };

  return (
    <article className="shop-card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
      <div
        className="shop-cover"
        style={shop.banner_url ? { backgroundImage: `url(${shop.banner_url})` } : undefined}
      />
      <div className="shop-identity">
        {shop.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.logo_url} alt="" className="shop-logo" />
        ) : (
          <div className="shop-logo" aria-hidden>
            <Store size={28} />
          </div>
        )}
        <div style={{ flex: 1, paddingBottom: '4px' }}>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}>{shop.name}</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
            ★ {Number(shop.rating || 0).toFixed(1)}
            {' · '}
            {products.length} products
            {shop.is_verified ? ' · Verified' : ''}
          </p>
          <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <MapPin size={14} />
            {shop.city}, {shop.state}
          </p>
        </div>
        <button type="button" className={following ? 'btn-secondary' : 'btn-card-add'} onClick={toggleFollow}>
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
      {shop.description && (
        <p style={{ padding: '0 24px 16px', color: 'var(--fg-secondary)', maxWidth: '720px' }}>{shop.description}</p>
      )}
      <div className="shop-tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>
      <div style={{ padding: '20px' }}>
        {tab === 'Reviews' ? (
          reviews.length === 0 ? (
            <p>No reviews for this shop yet.</p>
          ) : (
            <ul style={{ display: 'grid', gap: '12px', listStyle: 'none' }}>
              {reviews.map((review) => (
                <li key={review.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 14px' }}>
                  <strong>★ {review.rating}</strong>
                  {review.title ? ` · ${review.title}` : ''}
                  <p>{review.body}</p>
                </li>
              ))}
            </ul>
          )
        ) : tab === 'Categories' ? (
          categories.length === 0 ? (
            <p>This shop has no approved products yet.</p>
          ) : (
            categories.map(([name, items]) => (
              <section key={name} style={{ marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{name}</h2>
                <div className="product-list">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))
          )
        ) : products.length === 0 ? (
          <p>This shop has no approved products yet.</p>
        ) : (
          <>
            <h2 className="section-title" style={{ fontSize: '1.15rem', marginBottom: '12px' }}>
              {tab === 'Home' ? 'Featured products' : 'Products'}
            </h2>
            <div className="product-list">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
