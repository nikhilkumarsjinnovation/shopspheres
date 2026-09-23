'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import AudioDescriptionPlayer from '@/components/accessibility/AudioDescriptionPlayer';
import * as styles from '@/app/(customer)/customer.css';

export interface ProductDetailProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    compare_at_price?: number | null;
    average_rating?: number | null;
    review_count?: number | null;
    category: string;
    sub_category?: string | null;
    seller_id?: string;
    image_urls?: string[] | null;
    stock?: number | null;
    condition?: string | null;
    tags?: string[] | null;
    attributes?: any;
    created_at?: string;
  };
  merchant?: {
    name: string;
    description?: string | null;
    is_verified?: boolean;
  } | null;
  variants?: Array<{
    id: string;
    sku: string;
    title: string;
    price?: number;
    stock?: number;
    attributes?: any;
  }>;
  initialReviews?: Array<{
    id: string;
    customer_id: string;
    rating: number;
    title?: string | null;
    body: string;
    is_verified_purchase: boolean;
    helpful_votes: number;
    created_at: string;
    user_email?: string | null;
    user_name?: string | null;
  }>;
}

export default function ProductDetailClient({
  product,
  merchant,
  variants = [],
  initialReviews = [],
}: ProductDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refToken = searchParams.get('ref');
  const [sharerName, setSharerName] = useState<string | null>(null);
  const { addToCart } = useCart();

  // Image Gallery State
  const images =
    product.image_urls && product.image_urls.length > 0
      ? product.image_urls
      : ['/assets/product-1.png'];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Purchasing State
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0]!.id : null
  );
  const [addedNotice, setAddedNotice] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState(initialReviews);
  const [votedReviews, setVotedReviews] = useState<Set<string>>(new Set());
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!refToken) return;
    let active = true;
    fetchWithCsrf(`/api/v1/shared-products/${refToken}`)
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!active || !payload || typeof payload !== 'object' || !('sharerName' in payload)) return;
        if (typeof payload.sharerName === 'string') setSharerName(payload.sharerName);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [refToken]);

  // Active price calculation (checking variant override)
  const activeVariant = variants.find((v) => v.id === selectedVariantId);
  const currentPrice =
    activeVariant?.price !== null && activeVariant?.price !== undefined
      ? activeVariant.price
      : product.price;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > currentPrice
      ? Math.round(((product.compare_at_price - currentPrice) / product.compare_at_price) * 100)
      : null;

  const stock = activeVariant?.stock ?? product.stock ?? 10;
  const isOutOfStock = stock <= 0;

  // Add to Cart handler
  const handleAddToCart = () => {
    if (isOutOfStock) return;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        title: activeVariant ? `${product.title} (${activeVariant.title})` : product.title,
        price: currentPrice,
        seller_id: product.seller_id || '',
        image_url: images[0] || null,
        category: product.category,
      });
    }

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  // Buy Now handler
  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAddToCart();
    router.push('/checkout');
  };

  // Helpful Vote handler
  const handleHelpfulVote = async (reviewId: string) => {
    if (votedReviews.has(reviewId)) return;

    try {
      const res = await fetchWithCsrf('/api/v1/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId }),
      });

      if (res.ok) {
        const data = await res.json();
        setVotedReviews((prev) => new Set([...prev, reviewId]));
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, helpful_votes: data.helpful_votes } : r))
        );
      }
    } catch (err) {
      console.error('Failed to upvote review:', err);
    }
  };

  // Submit Review handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const res = await fetchWithCsrf('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewMessage(data.error || 'Failed to submit review.');
        return;
      }

      setReviews((prev) => [data.review, ...prev]);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewTitle('');
      setReviewMessage('Thank you! Your verified review has been published.');
      setTimeout(() => setReviewMessage(null), 5000);
    } catch (err) {
      setReviewMessage('An unexpected error occurred. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 10+ Technical Specifications aggregation
  const specList = [
    { label: 'Brand', value: (product.attributes as any)?.brand || merchant?.name || 'ShopSphere Select' },
    { label: 'Model / MPN', value: (product.attributes as any)?.model || `SPH-${product.id.slice(0, 6).toUpperCase()}` },
    { label: 'Condition', value: product.condition || 'Brand New (Factory Sealed)' },
    { label: 'Category', value: product.category },
    { label: 'Sub-Category', value: product.sub_category || 'General Marketplace' },
    { label: 'Dimensions', value: (product.attributes as any)?.dimensions || 'Standard Retail Packaging' },
    { label: 'Item Weight', value: (product.attributes as any)?.weight || '0.85 lbs (385 g)' },
    { label: 'Material', value: (product.attributes as any)?.material || 'Commercial High-Grade' },
    { label: 'Color / Finish', value: (product.attributes as any)?.color || 'Standard Commercial' },
    { label: 'Warranty', value: (product.attributes as any)?.warranty || '1-Year Limited Manufacturer Warranty' },
    { label: 'Country of Origin', value: (product.attributes as any)?.country_of_origin || 'Imported / Quality Certified' },
    { label: 'Merchant Fulfillment', value: merchant?.is_verified ? 'Verified Local ShopSphere Partner' : 'ShopSphere Certified Seller' },
  ];

  // Description feature bullet points
  const descriptionBullets = product.description
    .split(/\n|\. /)
    .map((b) => b.trim())
    .filter((b) => b.length > 10)
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0, fontFamily: 'var(--font-body), sans-serif' }}>
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6578', padding: '0 0 20px', borderBottom: '1px solid #07101f', marginBottom: 0 }}>
        <Link href="/explore" style={{ color: '#5a6578', textDecoration: 'none' }}>Explore</Link>
        <span>/</span>
        <span>{product.category}</span>
        {product.sub_category ? (<><span>/</span><span>{product.sub_category}</span></>) : null}
        <span>/</span>
        <span style={{ color: '#07101f', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{product.title}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.85fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ border: '1px solid #c5cedc', borderRadius: 16, background: '#e8edf4', overflow: 'hidden', boxShadow: '0 4px 16px rgba(7,16,31,0.08)' }}>
          <div style={{ width: '100%', aspectRatio: '4 / 5', background: '#e8edf4', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {discountPercent !== null ? (
              <span style={{ position: 'absolute', top: 0, left: 0, background: '#d6ff3a', color: '#07101f', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: '0 0 8px 0', zIndex: 2 }}>
                −{discountPercent}%
              </span>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImageIndex] || images[0]}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'none', transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
            />
          </div>
          {images.length > 1 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 6)}, 1fr)`, borderTop: '1px solid #07101f' }}>
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{ height: 72, border: 'none', borderRight: idx < images.length - 1 ? '1px solid #07101f' : 'none', padding: 0, background: activeImageIndex === idx ? '#2457ff' : '#ffffff', cursor: 'pointer', overflow: 'hidden' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: activeImageIndex === idx ? 0.55 : 1 }} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid #c5cedc', borderRadius: 16, boxShadow: '0 4px 16px rgba(7,16,31,0.08)', transform: 'translateY(12px)', border: '1px solid #c5cedc', borderRadius: 16, boxShadow: '0 4px 16px rgba(7,16,31,0.08)', transform: 'translateY(12px)' }}>
          <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid #07101f', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#07101f', border: '1px solid #07101f', padding: '4px 8px' }}>
                {merchant?.name ? merchant.name : product.category}
              </span>
              {merchant?.is_verified ? (
                <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6578' }}>Verified</span>
              ) : null}
            </div>
            {sharerName ? <p style={{ margin: 0, fontSize: 12, color: '#5a6578' }}>Sent by {sharerName}</p> : null}
            <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.05em', color: '#07101f', margin: 0, lineHeight: 0.95 }}>
              {product.title}
            </h1>
            {false && <AudioDescriptionPlayer productId={product.id} />}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5a6578' }}>
              <span style={{ color: '#07101f', fontWeight: 700 }}>{Number(product.average_rating || 5.0).toFixed(1)} / 5</span>
              <span>{reviews.length || product.review_count || 0} reviews</span>
            </div>
          </div>

          <div style={{ padding: '22px 28px', borderBottom: '1px solid #07101f', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#07101f' }}>{formatINR(currentPrice)}</span>
              {product.compare_at_price && product.compare_at_price > currentPrice ? (
                <span style={{ fontSize: 13, color: '#7a8699', textDecoration: 'line-through' }}>{formatINR(product.compare_at_price)}</span>
              ) : null}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#5a6578' }}>Inclusive of marketplace taxes. Free delivery over ₹499.</p>
          </div>

          <div style={{ padding: '18px 28px', borderBottom: '1px solid #07101f', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
            {['AI offer at checkout', 'UPI cashback ₹50', 'Free delivery'].map((label, i) => (
              <div key={label} style={{ padding: '10px 12px', borderRight: i < 2 ? '1px solid #e6e6e6' : 'none', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5a6578' }}>{label}</div>
            ))}
          </div>

          {variants.length > 0 ? (
            <div style={{ padding: '18px 28px', borderBottom: '1px solid #07101f', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a6578' }}>Edition</span>
              <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', border: '1px solid #07101f' }}>
                {variants.map((v, i) => {
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button key={v.id} type="button" onClick={() => setSelectedVariantId(v.id)} style={{ padding: '10px 14px', border: 'none', borderRight: i < variants.length - 1 ? '1px solid #07101f' : 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: isSelected ? '#2457ff' : '#ffffff', color: isSelected ? '#ffffff' : '#07101f', cursor: 'pointer' }}>
                      {v.title}{v.price ? ` · ${formatINR(v.price)}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div style={{ padding: '22px 28px', borderBottom: '1px solid #07101f', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 'auto' }}>
            {stock > 0 ? (
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#07101f' }}>
                {stock <= 5 ? `Only ${stock} left` : 'In stock'}
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6578' }}>Unavailable</span>
            )}
            {stock > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label htmlFor="qty-select" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a6578' }}>Qty</label>
                <select id="qty-select" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #07101f', fontSize: 13, background: '#ffffff' }}>
                  {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #07101f' }}>
              <button type="button" onClick={handleAddToCart} disabled={isOutOfStock} style={{ padding: '16px', border: 'none', borderRight: '1px solid #07101f', background: '#ffffff', color: '#07101f', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: isOutOfStock ? 'not-allowed' : 'pointer', opacity: isOutOfStock ? 0.4 : 1 }}>
                {addedNotice ? 'Added' : 'Add to bag'}
              </button>
              <button type="button" onClick={handleBuyNow} disabled={isOutOfStock} style={{ padding: '16px', border: '1.5px solid #2457ff', borderRadius: 8, background: '#2457ff', color: '#ffffff', fontSize: 12, fontWeight: 700, cursor: isOutOfStock ? 'not-allowed' : 'pointer', opacity: isOutOfStock ? 0.4 : 1 }}>
                Buy now
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#5a6578', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', letterSpacing: '0.04em' }}>
              <span>Ships · ShopSphere</span>
              <span>Sold · {merchant?.name || 'Merchant'}</span>
              <span>Returns · 30 days</span>
              <span>Pay · Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginTop: 16 }}>
        <div style={{ padding: '28px', border: '1px solid #c5cedc', borderRadius: 16, background: '#ffffff', boxShadow: '0 4px 16px rgba(7,16,31,0.06)' }}>
          <h3 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.03em', textTransform: 'uppercase', margin: '0 0 14px', color: '#07101f' }}>About</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, color: '#5a6578', lineHeight: 1.65 }}>
            {descriptionBullets.length > 0 ? descriptionBullets.map((bullet, idx) => <li key={idx}>{bullet}</li>) : <li>{product.description}</li>}
          </ul>
        </div>
        <div style={{ padding: '28px', border: '1px solid #c5cedc', borderRadius: 16, background: '#ffffff', boxShadow: '0 4px 16px rgba(7,16,31,0.06)', transform: 'translateY(16px)' }}>
          <h3 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.03em', textTransform: 'uppercase', margin: '0 0 14px', color: '#07101f' }}>Specifications</h3>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', border: '1px solid #07101f' }}>
            <tbody>
              {specList.map((spec, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#e8edf4' : '#ffffff', borderBottom: '1px solid #e6e6e6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10, color: '#5a6578', width: '40%' }}>{spec.label}</td>
                  <td style={{ padding: '10px 12px', color: '#07101f' }}>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ border: '1px solid #c5cedc', borderRadius: 16, marginTop: 16, padding: '28px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#07101f', margin: '0 0 6px' }}>Reviews</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#5a6578', letterSpacing: '0.04em' }}>Verified buyer notes.</p>
          </div>
          <button type="button" onClick={() => setShowReviewForm(!showReviewForm)} style={{ padding: '12px 18px', borderRadius: 8, background: '#2457ff', color: '#ffffff', border: '1.5px solid #2457ff', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {showReviewForm ? 'Cancel' : 'Write review'}
          </button>
        </div>

        {reviewMessage ? (
          <div style={{ padding: '12px 14px', background: '#e8edf4', border: '1px solid #07101f', borderLeftWidth: 4, color: '#07101f', fontSize: 13, fontWeight: 600 }}>{reviewMessage}</div>
        ) : null}

        {showReviewForm ? (
          <form onSubmit={handleSubmitReview} style={{ background: '#ffffff', padding: '20px', borderRadius: 8, border: '1px solid #07101f', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display), sans-serif', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.03em', textTransform: 'uppercase', color: '#07101f' }}>Your review</h3>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6578', marginBottom: 6 }}>Rating</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)} style={{ background: 'none', border: '1px solid #07101f', width: 36, height: 36, cursor: 'pointer', fontSize: 16, color: star <= reviewRating ? '#07101f' : '#cccccc' }}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6578', marginBottom: 6 }}>Headline</label>
              <input type="text" placeholder="Most important detail" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #07101f', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6578', marginBottom: 6 }}>Review</label>
              <textarea rows={4} required placeholder="What stood out?" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #07101f', fontSize: 13, fontFamily: 'inherit' }} />
            </div>
            <button type="submit" disabled={submittingReview} style={{ alignSelf: 'flex-start', padding: '12px 20px', borderRadius: 8, background: '#2457ff', color: '#ffffff', border: '1.5px solid #2457ff', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: submittingReview ? 'not-allowed' : 'pointer' }}>
              {submittingReview ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        ) : null}

        {reviews.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '2rem' }}>
            <p style={{ margin: 0 }}>No reviews yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #07101f' }}>
            {reviews.map((r, i) => (
              <div key={r.id} style={{ background: '#ffffff', padding: '18px 20px', borderRadius: 8, borderBottom: i < reviews.length - 1 ? '1px solid #e6e6e6' : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#07101f' }}>{r.rating}/5</span>
                  {r.title ? <strong style={{ fontSize: 13, color: '#07101f' }}>{r.title}</strong> : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#5a6578', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  <span>{r.user_name || r.user_email || 'Customer'}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  {r.is_verified_purchase ? (<><span>·</span><span style={{ color: '#07101f', fontWeight: 700 }}>Verified</span></>) : null}
                </div>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#5a6578', lineHeight: 1.55 }}>{r.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <button type="button" onClick={() => handleHelpfulVote(r.id)} disabled={votedReviews.has(r.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #07101f', background: votedReviews.has(r.id) ? '#e8edf4' : '#ffffff', color: '#07101f', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: votedReviews.has(r.id) ? 'default' : 'pointer' }}>
                    Helpful ({r.helpful_votes || 0})
                  </button>
                  {votedReviews.has(r.id) ? <span style={{ fontSize: 11, color: '#5a6578' }}>Thanks</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

}
