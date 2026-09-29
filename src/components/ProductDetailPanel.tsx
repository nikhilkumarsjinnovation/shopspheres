'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Minus, Plus, Check, ImageOff, PackageSearch } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';
import type { BaseProduct } from './ExploreFeedClient';

interface ProductDetailPanelProps {
  product: BaseProduct | null | undefined;
  onClose: () => void;
}

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductDetailPanel({ product, onClose }: ProductDetailPanelProps) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!product) {
    return (
      <div className="detail-empty">
        <span className="detail-empty-icon">
          <PackageSearch size={30} strokeWidth={1.5} />
        </span>
        <h3>No product selected</h3>
        <p>Click any product in the list to view its full specifications here — no page jumps needed.</p>
      </div>
    );
  }

  const images = product.image_urls && product.image_urls.length > 0 ? product.image_urls : [];
  const safeActiveImg = Math.min(activeImg, Math.max(images.length - 1, 0));
  const rating = Number(product.average_rating || 0);
  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;
  const stock = product.stock ?? 10;
  const isOutOfStock = stock <= 0;
  const inCart = cart.find((item) => item.id === product.id);

  const attrs =
    product.attributes && typeof product.attributes === 'object' ? product.attributes : {};
  const specEntries: Array<{ label: string; value: string }> = Object.entries(attrs)
    .slice(0, 8)
    .map(([k, v]) => ({
      label: prettifyKey(k),
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
    }));
  if (product.sub_category) {
    specEntries.unshift({ label: 'Sub-category', value: product.sub_category });
  }
  if (product.condition) {
    specEntries.unshift({ label: 'Condition', value: product.condition });
  }

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        seller_id: product.seller_id || '',
        image_url: images[0] || null,
        category: product.category,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="detail-panel">
      <div className="detail-head">
        <span className="card-category-label">{product.category}</span>
        <button
          type="button"
          className="btn-unflip"
          onClick={onClose}
          aria-label="Close product details"
          title="Close details"
        >
          <X size={14} />
        </button>
      </div>

      <div className="detail-media">
        {images.length > 0 && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={images[safeActiveImg]}
            src={images[safeActiveImg]}
            alt={product.title}
            className="detail-img animate-slide-up"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="detail-img-fallback">
            <ImageOff size={30} strokeWidth={1.5} aria-hidden />
            <span>Preview Unavailable</span>
          </div>
        )}
        {discountPercent !== null && (
          <span className="card-discount-badge">−{discountPercent}% OFF</span>
        )}
      </div>

      {images.length > 1 && (
        <div className="detail-thumbs" role="tablist" aria-label="Product images">
          {images.slice(0, 5).map((src, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === safeActiveImg}
              className={`detail-thumb ${idx === safeActiveImg ? 'active' : ''}`}
              onClick={() => setActiveImg(idx)}
              aria-label={`View image ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" onError={() => setImgError(true)} />
            </button>
          ))}
        </div>
      )}

      <h2 className="detail-title">{product.title}</h2>

      <p className="flip-rating">
        ★ {rating > 0 ? rating.toFixed(1) : '5.0'}{' '}
        <span>
          ({product.review_count || 1} verified review{(product.review_count || 1) === 1 ? '' : 's'})
        </span>
      </p>

      <div className="price-stack flip-back-price">
        <span className="price-current detail-price">{formatINR(product.price)}</span>
        {product.compare_at_price && product.compare_at_price > product.price ? (
          <span className="price-compare">{formatINR(product.compare_at_price)}</span>
        ) : null}
        {discountPercent !== null && (
          <span className="flip-save">Save {discountPercent}%</span>
        )}
      </div>

      {isOutOfStock ? (
        <p className="card-stock-notice" style={{ marginBottom: 0 }}>Sold out</p>
      ) : inCart || stock > 5 ? (
        <p className="flip-stock-ok">✓ In stock · Free Express Delivery</p>
      ) : (
        <p className="card-stock-notice" style={{ marginBottom: 0 }}>
          ⚡ Only {stock} units left in stock
        </p>
      )}

      {product.description && (
        <p className="detail-desc">{product.description}</p>
      )}

      {specEntries.length > 0 && (
        <div>
          <h4 className="filter-section-title">Specifications</h4>
          <table className="detail-specs">
            <tbody>
              {specEntries.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.label}</td>
                  <td>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {product.tags && product.tags.length > 0 && (
        <div className="detail-tags">
          {product.tags.slice(0, 6).map((t) => (
            <span key={t} className="detail-tag">{t}</span>
          ))}
        </div>
      )}

      <div className="detail-buy-row">
        {inCart ? (
          <div className="qty-stepper" style={{ flex: 1, justifyContent: 'center', padding: '0.35rem' }}>
            <button
              type="button"
              className="qty-stepper-btn"
              aria-label="Decrease quantity"
              onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
            >
              <Minus size={14} />
            </button>
            <span className="qty-stepper-val">
              {inCart.quantity} in Bag
            </span>
            <button
              type="button"
              className="qty-stepper-btn"
              aria-label="Increase quantity"
              onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="qty-stepper">
              <button
                type="button"
                className="qty-stepper-btn"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="qty-stepper-val">{qty}</span>
              <button
                type="button"
                className="qty-stepper-btn"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              type="button"
              className="btn-confirm-add"
              style={{ flex: 1 }}
              onClick={handleAdd}
              disabled={isOutOfStock}
            >
              {added ? (
                <>
                  <Check size={14} /> Added
                </>
              ) : (
                <>Add {qty > 1 ? `${qty}x · ` : ''}{formatINR(product.price * qty)}</>
              )}
            </button>
          </>
        )}
      </div>

      <Link href={`/product/${product.id}`} className="btn-view-details">
        Open full product page →
      </Link>
    </div>
  );
}
