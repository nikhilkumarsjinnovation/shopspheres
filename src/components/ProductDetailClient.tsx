'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
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
      const res = await fetchWithCsrf('/api/reviews', {
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
      const res = await fetchWithCsrf('/api/reviews', {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* 1. Breadcrumb navigation */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#64748b',
          paddingBottom: '8px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Link href="/explore" style={{ color: '#64748b', textDecoration: 'none' }}>
          Explore
        </Link>
        <span>›</span>
        <span style={{ color: '#64748b' }}>{product.category}</span>
        {product.sub_category && (
          <>
            <span>›</span>
            <span style={{ color: '#64748b' }}>{product.sub_category}</span>
          </>
        )}
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
          {product.title}
        </span>
      </nav>

      {/* 2. Three-Column Amazon-Style Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 420px) 1fr minmax(280px, 340px)',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* COLUMN 1: Multi-Image Showcase Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '80px' }}>
          <div
            style={{
              width: '100%',
              height: '380px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            {discountPercent !== null && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  zIndex: 2,
                }}
              >
                -{discountPercent}% DEAL
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImageIndex] || images[0]}
              alt={product.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                padding: '16px',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>

          {/* Thumbnail row if multiple images exist */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '6px',
                    border: activeImageIndex === idx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    padding: '2px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2: Product Core Information & 10+ Specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                {merchant?.name ? `Store: ${merchant.name}` : `Category: ${product.category}`}
              </span>
              {merchant?.is_verified && (
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>✓ Verified Merchant</span>
              )}
            </div>

            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.25 }}>
              {product.title}
            </h1>

            {/* Ratings Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <div style={{ color: '#f59e0b', fontSize: '16px' }}>
                {'★'.repeat(Math.round(product.average_rating || 5))}
                {'☆'.repeat(5 - Math.round(product.average_rating || 5))}
              </div>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {Number(product.average_rating || 5.0).toFixed(1)}
              </span>
              <span style={{ color: '#64748b' }}>
                ({reviews.length || product.review_count || 0} customer reviews)
              </span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />

          {/* Pricing Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
                {formatINR(currentPrice)}
              </span>
              {product.compare_at_price && product.compare_at_price > currentPrice && (
                <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through' }}>
                  M.R.P: {formatINR(product.compare_at_price)}
                </span>
              )}
              {discountPercent !== null && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                  Save {discountPercent}%
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Inclusive of all local marketplace taxes & transparent seller fee.
            </p>
          </div>

          {/* Amazon-Style Special Offers & Behavioral Deals Card */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px' }}>🏷️</span>
                <strong style={{ fontSize: '13px', color: '#14532d' }}>Special Offers for You</strong>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px' }}>
                Verified Deals
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px dashed #22c55e', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                <strong style={{ color: '#15803d', display: 'block', marginBottom: '2px' }}>AI Behavior Offer</strong>
                <span style={{ color: '#475569' }}>Apply code at checkout for up to ₹1,000 instant discount based on your browsing pattern.</span>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px dashed #22c55e', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                <strong style={{ color: '#15803d', display: 'block', marginBottom: '2px' }}>UPI Instant Cashback</strong>
                <span style={{ color: '#475569' }}>Flat ₹50 OFF on orders above ₹499 paid via Google Pay, PhonePe, Paytm, or BHIM.</span>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px dashed #22c55e', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                <strong style={{ color: '#15803d', display: 'block', marginBottom: '2px' }}>Free Delivery</strong>
                <span style={{ color: '#475569' }}>Eligible for FREE standard delivery across India on orders above ₹499.</span>
              </div>
            </div>
          </div>

          {/* Variants Selector if available */}
          {variants.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Select Edition / Variant:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#1d4ed8' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {v.title}
                      {v.price ? ` (${formatINR(v.price)})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* About this item / Key feature bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              About this item
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
              {descriptionBullets.length > 0 ? (
                descriptionBullets.map((bullet, idx) => <li key={idx}>{bullet}</li>)
              ) : (
                <li>{product.description}</li>
              )}
            </ul>
          </div>

          {/* 10+ Technical Specifications Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Product Specifications & Details
            </h3>
            <table
              style={{
                width: '100%',
                fontSize: '12px',
                borderCollapse: 'collapse',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <tbody>
                {specList.map((spec, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', width: '35%' }}>
                      {spec.label}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#0f172a' }}>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 3: Amazon "Buy Box" Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'sticky',
            top: '80px',
          }}
        >
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {formatINR(currentPrice)}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              FREE Delivery on orders over ₹499
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Estimated arrival: <strong>Within 24–48 Hours</strong>
            </p>
          </div>

          <div>
            {stock > 0 ? (
              <span style={{ fontSize: '14px', fontWeight: 700, color: stock <= 5 ? '#b91c1c' : '#059669' }}>
                {stock <= 5 ? `Only ${stock} left in stock - order soon.` : 'In Stock'}
              </span>
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                Currently Unavailable
              </span>
            )}
          </div>

          {stock > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="qty-select" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Quantity:
              </label>
              <select
                id="qty-select"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              >
                {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#ffd814',
                color: '#0f172a',
                border: '1px solid #fcd200',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                opacity: isOutOfStock ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'background-color 0.15s',
              }}
            >
              {addedNotice ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#ffa41c',
                color: '#0f172a',
                border: '1px solid #ff8f00',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                opacity: isOutOfStock ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              Buy Now
            </button>
          </div>

          {/* Guarantees & Attribution */}
          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ships from</span>
              <strong style={{ color: '#0f172a' }}>ShopSphere Logistics</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sold by</span>
              <strong style={{ color: '#0f172a' }}>{merchant?.name || 'Authorized Merchant'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Returns</span>
              <strong style={{ color: '#059669' }}>30-Day Money-Back Guarantee</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment</span>
              <strong style={{ color: '#0f172a' }}>256-Bit SSL Encrypted</strong>
            </div>
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

      {/* 3. Verified Customer Reviews & AI Review Insights Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Customer Reviews & Ratings
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Verified buyer evaluations analyzed by ShopSphere AI for authenticity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowReviewForm(!showReviewForm)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showReviewForm ? 'Cancel Review' : 'Write a Review'}
          </button>
        </div>

        {/* Review feedback message */}
        {reviewMessage && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {reviewMessage}
          </div>
        )}

        {/* Write a Review Modal / Form */}
        {showReviewForm && (
          <form
            onSubmit={handleSubmitReview}
            style={{
              backgroundColor: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Write a Verified Customer Review
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Overall Rating:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '24px',
                      color: star <= reviewRating ? '#f59e0b' : '#cbd5e1',
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Review Headline:
              </label>
              <input
                type="text"
                placeholder="What's the most important thing to know?"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Written Review:
              </label>
              <textarea
                rows={4}
                required
                placeholder="What did you like or dislike? What did you use this product for?"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 20px',
                borderRadius: '6px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: submittingReview ? 'not-allowed' : 'pointer',
              }}
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '2rem' }}>
            <p style={{ margin: 0 }}>No customer reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ color: '#f59e0b', fontSize: '14px' }}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </div>
                  {r.title && (
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{r.title}</strong>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                  <span>Reviewed by {r.user_name || r.user_email || 'Verified Customer'}</span>
                  <span>•</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  {r.is_verified_purchase && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>Verified Purchase</span>
                    </>
                  )}
                </div>

                <p style={{ margin: '4px 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  {r.body}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleHelpfulVote(r.id)}
                    disabled={votedReviews.has(r.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: votedReviews.has(r.id) ? '#f1f5f9' : '#ffffff',
                      color: votedReviews.has(r.id) ? '#94a3b8' : '#475569',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: votedReviews.has(r.id) ? 'default' : 'pointer',
                    }}
                  >
                    Helpful ({r.helpful_votes || 0})
                  </button>
                  {votedReviews.has(r.id) && (
                    <span style={{ fontSize: '11px', color: '#059669' }}>Thanks for your feedback!</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
