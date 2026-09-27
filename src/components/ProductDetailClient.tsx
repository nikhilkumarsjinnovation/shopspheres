'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
    <div>
      <nav aria-label="Breadcrumb">
        <Link href="/explore">Explore</Link>
        <span>/</span>
        <span>{product.category}</span>
        {product.sub_category ? (<><span>/</span><span>{product.sub_category}</span></>) : null}
        <span>/</span>
        <span>{product.title}</span>
      </nav>

      <div>
        <div>
          <div>
            {discountPercent !== null ? (
              <span>
                −{discountPercent}%
              </span>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImageIndex] || images[0]}
              alt={product.title}
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
            />
          </div>
          {images.length > 1 ? (
            <div>
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div>
            <div>
              <span>
                {merchant?.name ? merchant.name : product.category}
              </span>
              {merchant?.is_verified ? (
                <span>Verified</span>
              ) : null}
            </div>
            {sharerName ? <p>Sent by {sharerName}</p> : null}
            <h1>
              {product.title}
            </h1>
            {false && <AudioDescriptionPlayer productId={product.id} />}
            <div>
              <span>{Number(product.average_rating || 5.0).toFixed(1)} / 5</span>
              <span>{reviews.length || product.review_count || 0} reviews</span>
            </div>
          </div>

          <div>
            <div>
              <span>{formatINR(currentPrice)}</span>
              {product.compare_at_price && product.compare_at_price > currentPrice ? (
                <span>{formatINR(product.compare_at_price)}</span>
              ) : null}
            </div>
            <p>Inclusive of marketplace taxes. Free delivery over ₹499.</p>
          </div>

          <div>
            {['AI offer at checkout', 'UPI cashback ₹50', 'Free delivery'].map((label, i) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          {variants.length > 0 ? (
            <div>
              <span>Edition</span>
              <div>
                {variants.map((v, i) => {
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button key={v.id} type="button" onClick={() => setSelectedVariantId(v.id)}>
                      {v.title}{v.price ? ` · ${formatINR(v.price)}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            {stock > 0 ? (
              <span>
                {stock <= 5 ? `Only ${stock} left` : 'In stock'}
              </span>
            ) : (
              <span>Unavailable</span>
            )}
            {stock > 0 ? (
              <div>
                <label htmlFor="qty-select">Qty</label>
                <select id="qty-select" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                  {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <button type="button" onClick={handleAddToCart} disabled={isOutOfStock}>
                {addedNotice ? 'Added' : 'Add to bag'}
              </button>
              <button type="button" onClick={handleBuyNow} disabled={isOutOfStock}>
                Buy now
              </button>
            </div>
            <div>
              <span>Ships · ShopSphere</span>
              <span>Sold · {merchant?.name || 'Merchant'}</span>
              <span>Returns · 30 days</span>
              <span>Pay · Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div>
          <h3>About</h3>
          <ul>
            {descriptionBullets.length > 0 ? descriptionBullets.map((bullet, idx) => <li key={idx}>{bullet}</li>) : <li>{product.description}</li>}
          </ul>
        </div>
        <div>
          <h3>Specifications</h3>
          <table>
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

      <div>
        <div>
          <div>
            <h2>Reviews</h2>
            <p>Verified buyer notes.</p>
          </div>
          <button type="button" onClick={() => setShowReviewForm(!showReviewForm)}>
            {showReviewForm ? 'Cancel' : 'Write review'}
          </button>
        </div>

        {reviewMessage ? (
          <div>{reviewMessage}</div>
        ) : null}

        {showReviewForm ? (
          <form onSubmit={handleSubmitReview}>
            <h3>Your review</h3>
            <div>
              <label>Rating</label>
              <div>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label>Headline</label>
              <input type="text" placeholder="Most important detail" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} />
            </div>
            <div>
              <label>Review</label>
              <textarea rows={4} required placeholder="What stood out?" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            </div>
            <button type="submit" disabled={submittingReview}>
              {submittingReview ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        ) : null}

        {reviews.length === 0 ? (
          <div>
            <p>No reviews yet.</p>
          </div>
        ) : (
          <div>
            {reviews.map((r, i) => (
              <div key={r.id}>
                <div>
                  <span>{r.rating}/5</span>
                  {r.title ? <strong>{r.title}</strong> : null}
                </div>
                <div>
                  <span>{r.user_name || r.user_email || 'Customer'}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  {r.is_verified_purchase ? (<><span>·</span><span>Verified</span></>) : null}
                </div>
                <p>{r.body}</p>
                <div>
                  <button type="button" onClick={() => handleHelpfulVote(r.id)} disabled={votedReviews.has(r.id)}>
                    Helpful ({r.helpful_votes || 0})
                  </button>
                  {votedReviews.has(r.id) ? <span>Thanks</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

}
