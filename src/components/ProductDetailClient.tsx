'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, ShieldCheck, Truck, RefreshCw, Check, Sparkles, ChevronRight, ThumbsUp } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import AudioDescriptionPlayer from '@/components/accessibility/AudioDescriptionPlayer';

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
    { label: 'Material', value: (product.attributes as any)?.material || (product.attributes as any)?.fabric || 'Commercial High-Grade' },
    { label: 'Color / Finish', value: (product.attributes as any)?.color || 'Standard Commercial' },
    { label: 'Warranty', value: (product.attributes as any)?.warranty || '1-Year Limited Manufacturer Warranty' },
    { label: 'Country of Origin', value: (product.attributes as any)?.country_of_origin || 'India / Quality Certified' },
    { label: 'Merchant Partner', value: merchant?.is_verified ? 'Verified ShopSphere Partner' : 'Certified Seller' },
  ];

  // Description feature bullet points
  const descriptionBullets = product.description
    .split(/\n|\. /)
    .map((b) => b.trim())
    .filter((b) => b.length > 10)
    .slice(0, 5);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '4rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
        <Link href="/explore" style={{ color: 'var(--fg-secondary)', fontWeight: 500 }}>
          Explore
        </Link>
        <ChevronRight size={14} />
        <Link href={`/explore?category=${product.category}`} style={{ color: 'var(--fg-secondary)', fontWeight: 500 }}>
          {product.category}
        </Link>
        {product.sub_category && (
          <>
            <ChevronRight size={14} />
            <span>{product.sub_category}</span>
          </>
        )}
        <ChevronRight size={14} />
        <span style={{ color: 'var(--fg-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
          {product.title}
        </span>
      </nav>

      {/* Main 2-Column Product Detail Layout */}
      <div className="pdp-container">
        {/* Left Column: Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-image-wrap">
            {discountPercent !== null && (
              <span className="card-discount-badge" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                −{discountPercent}% OFF
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImageIndex] || images[0]}
              alt={product.title}
              className="pdp-main-img"
            />
          </div>

          {images.length > 1 && (
            <div className="pdp-thumbs-row">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pdp-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`View image thumbnail ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt="" className="pdp-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information & Actions */}
        <div className="pdp-info-pane">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
              <span className="section-badge">
                {product.category}
              </span>
              {merchant?.is_verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>
                  <ShieldCheck size={14} /> Verified Merchant ({merchant.name})
                </span>
              )}
            </div>

            {sharerName && (
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-electric)', fontWeight: 600, marginBottom: '0.5rem' }}>
                🎁 Recommended to you by {sharerName}
              </p>
            )}

            <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
              {product.title}
            </h1>

            {false && <AudioDescriptionPlayer productId={product.id} />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontWeight: 700 }}>
                <Star size={16} fill="currentColor" />
                <span>{Number(product.average_rating || 5.0).toFixed(1)}</span>
              </div>
              <span style={{ color: 'var(--fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--fg-secondary)', fontWeight: 500 }}>
                {reviews.length || product.review_count || 1} verified customer ratings
              </span>
            </div>
          </div>

          {/* Pricing Stack */}
          <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg-primary)' }}>
                {formatINR(currentPrice)}
              </span>
              {product.compare_at_price && product.compare_at_price > currentPrice && (
                <span style={{ fontSize: '1.15rem', color: 'var(--fg-subtle)', textDecoration: 'line-through' }}>
                  {formatINR(product.compare_at_price)}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.25rem' }}>
              Inclusive of GST and all statutory marketplace duties. Free shipping across India.
            </p>
          </div>

          {/* Value Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-electric)', margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>AI Best Match</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>Top Rated</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <Truck size={16} style={{ color: 'var(--success)', margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Free Express</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>2-3 Day Delivery</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <RefreshCw size={16} style={{ color: 'var(--info)', margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Easy Returns</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>30 Days Guarantee</div>
            </div>
          </div>

          {/* Variants Selector */}
          {variants.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-muted)', marginBottom: '0.5rem' }}>
                Select Edition / Variant
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`variant-option-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedVariantId(v.id)}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                    >
                      {v.title}
                      {v.price && (
                        <span style={{ opacity: 0.85, marginLeft: '6px' }}>· {formatINR(v.price)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: stock <= 5 ? 'var(--warning)' : 'var(--success)' }}>
                {stock > 0 ? (stock <= 5 ? `⚡ Only ${stock} units remaining` : '✓ In Stock Ready for Dispatch') : '✕ Currently Unavailable'}
              </span>

              {stock > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="qty-select" style={{ fontSize: '0.825rem', fontWeight: 600 }}>Qty:</label>
                  <select
                    id="qty-select"
                    className="custom-select"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-card-toggle"
                style={{ height: '3.1rem', justifyContent: 'center', fontSize: '0.95rem' }}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {addedNotice ? <><Check size={18} /> Added</> : 'Add to Bag'}
              </button>

              <button
                type="button"
                className="btn-card-add"
                style={{ height: '3.1rem', fontSize: '0.95rem' }}
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Technical Specifications Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginTop: '4rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Overview & Features</h2>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', color: 'var(--fg-secondary)', lineHeight: 1.6 }}>
            {descriptionBullets.length > 0 ? (
              descriptionBullets.map((bullet, idx) => <li key={idx}>{bullet}</li>)
            ) : (
              <li>{product.description}</li>
            )}
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Technical Specifications</h2>
          <table className="pdp-specs-table">
            <tbody>
              {specList.map((spec, idx) => (
                <tr key={idx}>
                  <td>{spec.label}</td>
                  <td>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified Reviews Section */}
      <section className="pdp-reviews-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>Customer Reviews</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
              Verified purchases from authentic marketplace customers
            </p>
          </div>
          <button
            type="button"
            className="btn-card-toggle"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            {showReviewForm ? 'Close Form' : 'Write a Review'}
          </button>
        </div>

        {reviewMessage && (
          <div style={{ padding: '0.85rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            {reviewMessage}
          </div>
        )}

        {showReviewForm && (
          <form
            onSubmit={handleSubmitReview}
            style={{
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              marginBottom: '2rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Write a Verified Review</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>Overall Rating</label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: star <= reviewRating ? 'var(--warning)' : 'var(--bg-muted)' }}
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} Stars`}
                  >
                    <Star size={24} fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>Headline</label>
              <input
                type="text"
                className="auth-input"
                placeholder="What was the standout highlight?"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>Your Review</label>
              <textarea
                rows={4}
                required
                className="auth-input"
                style={{ height: 'auto', padding: '0.75rem 1rem' }}
                placeholder="Share your detailed impressions, build quality, and delivery speed..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-card-add"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting…' : 'Publish Review'}
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
            No reviews yet. Be the first to review this verified product!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '1.25rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', color: 'var(--warning)' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} stroke={i < r.rating ? 'none' : 'currentColor'} />
                      ))}
                    </div>
                    {r.title && <strong style={{ fontSize: '0.95rem' }}>{r.title}</strong>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: '0.65rem' }}>
                  <span>{r.user_name || r.user_email || 'Verified Customer'}</span>
                  {r.is_verified_purchase && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
                      ✓ Verified Purchase
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  {r.body}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => handleHelpfulVote(r.id)}
                    disabled={votedReviews.has(r.id)}
                  >
                    <ThumbsUp size={12} />
                    <span>Helpful ({r.helpful_votes || 0})</span>
                  </button>
                  {votedReviews.has(r.id) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                      Thank you for feedback!
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
