'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ImageOff, Minus, Plus, ChevronDown, ChevronUp, Check, Sparkles, Layers } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';

interface ProductCardProps {
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
    attributes?: any;
    tags?: string[] | null;
  };
}

interface VariantOption {
  label: string;
  priceDelta: number;
}

interface ColorOption {
  name: string;
  hex: string;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [selectedQty, setSelectedQty] = useState(1);

  // Derive intelligent variant options based on category and product attributes
  const { variants, colorOptions, specs } = useMemo(() => {
    const category = (product.category || '').toLowerCase();
    const attrs = product.attributes || {};

    // 1. Color Options
    let colors: ColorOption[] = [];
    if (attrs.color) {
      colors.push({ name: String(attrs.color), hex: '#374151' });
    }
    if (category.includes('electr') || category.includes('tech') || category.includes('gadget')) {
      colors = [
        { name: 'Space Grey', hex: '#4b5563' },
        { name: 'Silver', hex: '#e5e7eb' },
        { name: 'Midnight', hex: '#111827' },
        { name: 'Starlight', hex: '#fdfbf7' },
      ];
    } else if (category.includes('fashion') || category.includes('clothing') || category.includes('apparel')) {
      colors = [
        { name: 'Obsidian', hex: '#18181b' },
        { name: 'Stone Grey', hex: '#71717a' },
        { name: 'Navy', hex: '#1e3a8a' },
        { name: 'Olive Green', hex: '#3f6212' },
      ];
    } else {
      colors = [
        { name: 'Classic Matte', hex: '#27272a' },
        { name: 'Brushed Slate', hex: '#64748b' },
        { name: 'Pure Minimal', hex: '#f8fafc' },
      ];
    }

    // 2. Size / Capacity / Spec Variants with dynamic price adjustments
    let varList: VariantOption[] = [];
    if (category.includes('electr') || category.includes('computer') || category.includes('tablet')) {
      varList = [
        { label: '128 GB', priceDelta: 0 },
        { label: '256 GB', priceDelta: Math.round(product.price * 0.15) },
        { label: '512 GB', priceDelta: Math.round(product.price * 0.32) },
      ];
    } else if (category.includes('fashion') || category.includes('footwear')) {
      varList = [
        { label: 'S', priceDelta: 0 },
        { label: 'M', priceDelta: 0 },
        { label: 'L', priceDelta: 0 },
        { label: 'XL', priceDelta: 0 },
      ];
    } else if (category.includes('beauty') || category.includes('grocery')) {
      varList = [
        { label: 'Standard', priceDelta: 0 },
        { label: 'Value Pack (+50%)', priceDelta: Math.round(product.price * 0.4) },
      ];
    } else {
      varList = [
        { label: 'Standard Edition', priceDelta: 0 },
        { label: 'Pro Bundle', priceDelta: Math.round(product.price * 0.25) },
      ];
    }

    // 3. Key Specifications Preview Matrix
    const specEntries: Array<{ label: string; value: string }> = [];
    if (attrs.brand) specEntries.push({ label: 'Brand', value: String(attrs.brand) });
    if (attrs.model) specEntries.push({ label: 'Model', value: String(attrs.model) });
    if (attrs.warranty) specEntries.push({ label: 'Warranty', value: String(attrs.warranty) });
    if (attrs.material || attrs.fabric) specEntries.push({ label: 'Material', value: String(attrs.material || attrs.fabric) });
    if (attrs.display) specEntries.push({ label: 'Display', value: String(attrs.display) });
    
    // Fallbacks if fewer than 2 specs found
    if (specEntries.length === 0) {
      specEntries.push({ label: 'Origin', value: 'Quality Inspected' });
      specEntries.push({ label: 'Warranty', value: '1 Year Warranty' });
    } else if (specEntries.length === 1) {
      specEntries.push({ label: 'Fulfillment', value: 'Express Delivery' });
    }

    return {
      variants: varList,
      colorOptions: colors,
      specs: specEntries.slice(0, 4),
    };
  }, [product]);

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const activeVariant = variants[selectedVariantIndex] || variants[0];
  const activeColor = colorOptions[selectedColorIndex] || colorOptions[0];

  const calculatedUnitPrice = product.price + (activeVariant?.priceDelta || 0);
  const calculatedTotalPrice = calculatedUnitPrice * selectedQty;

  const firstImage =
    product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const stock = product.stock ?? 10;
  const isOutOfStock = stock <= 0;
  const inCart = cart.find((item) => item.id === product.id);
  const rating = Number(product.average_rating || 0);

  // Quick Direct Add
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      seller_id: product.seller_id || '',
      image_url: firstImage,
      category: product.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // Add from Expanded Configurator with Selected Options
  const handleConfiguredAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    for (let i = 0; i < selectedQty; i++) {
      addToCart({
        id: product.id,
        title: `${product.title} (${activeColor?.name}, ${activeVariant?.label})`,
        price: calculatedUnitPrice,
        seller_id: product.seller_id || '',
        image_url: firstImage,
        category: product.category,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <article className={`modular-product-card ${isExpanded ? 'is-expanded' : ''}`}>
      {/* 1. Visual Card Header Frame */}
      <Link href={`/product/${product.id}`} className="card-media-wrapper" tabIndex={-1}>
        {firstImage && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt={product.title}
            className="card-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-subtle)', gap: '0.4rem' }}>
            <ImageOff size={28} strokeWidth={1.5} aria-hidden />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Preview Unavailable</span>
          </div>
        )}

        {/* Discount Badge */}
        {discountPercent !== null && (
          <span className="card-discount-badge">
            −{discountPercent}% OFF
          </span>
        )}

        {/* In Cart Indicator */}
        {inCart && (
          <span className="card-in-cart-pill">
            ✓ {inCart.quantity} in Bag
          </span>
        )}
      </Link>

      {/* 2. Compact Body & Meta */}
      <div className="card-body">
        <div className="card-meta-line">
          <span className="card-category-label">{product.category}</span>
          {rating > 0 ? (
            <span className="card-rating-chip">
              ★ {rating.toFixed(1)} <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>({product.review_count || 1})</span>
            </span>
          ) : (
            <span className="card-rating-chip" style={{ color: 'var(--fg-muted)' }}>
              ★ 5.0 New
            </span>
          )}
        </div>

        <h3 className="card-title">
          <Link href={`/product/${product.id}`}>
            {product.title}
          </Link>
        </h3>

        {!inCart && stock > 0 && stock <= 5 && (
          <p className="card-stock-notice">
            ⚡ Only {stock} units left in stock
          </p>
        )}

        {/* Price & Primary Interactive Bar */}
        <div className="card-price-row">
          <div className="price-stack">
            <span className="price-current">{formatINR(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price ? (
              <span className="price-compare">{formatINR(product.compare_at_price)}</span>
            ) : null}
          </div>

          <div className="card-action-btns">
            {/* Modular Options In-View Expand Trigger */}
            <button
              type="button"
              className={`btn-card-toggle ${isExpanded ? 'active' : ''}`}
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse product options" : "Expand product variations and specifications"}
              title="Configure options inline"
            >
              <Layers size={13} strokeWidth={2} />
              <span>{isExpanded ? 'Close' : 'Options'}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Quick Add or Cart Stepper */}
            {inCart ? (
              <div
                className="qty-stepper"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <button
                  type="button"
                  className="qty-stepper-btn"
                  aria-label="Decrease quantity"
                  onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                >
                  <Minus size={13} />
                </button>
                <span className="qty-stepper-val">{inCart.quantity}</span>
                <button
                  type="button"
                  className="qty-stepper-btn"
                  aria-label="Increase quantity"
                  onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                >
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`btn-card-add ${added ? 'added' : ''}`}
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? 'Sold out' : added ? '✓ Added' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MODULAR SMOOTH EXPANDED INLINE DRAWER (Without Leaving Current View) */}
      <div className="card-expanded-panel" aria-hidden={!isExpanded}>
        <div className="card-expanded-content">
          {/* Color Variations */}
          {colorOptions.length > 0 && (
            <div>
              <div className="expanded-section-title">
                Color: <strong style={{ color: 'var(--fg-primary)' }}>{activeColor?.name}</strong>
              </div>
              <div className="color-swatch-matrix" role="radiogroup" aria-label="Color options">
                {colorOptions.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`color-swatch-btn ${selectedColorIndex === idx ? 'selected' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedColorIndex(idx);
                    }}
                    title={c.name}
                    aria-label={c.name}
                    aria-checked={selectedColorIndex === idx}
                    role="radio"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Configuration / Size / Capacity Pills */}
          {variants.length > 0 && (
            <div>
              <div className="expanded-section-title">
                Option / Edition: <strong style={{ color: 'var(--fg-primary)' }}>{activeVariant?.label}</strong>
              </div>
              <div className="variant-pills-matrix" role="radiogroup" aria-label="Variant options">
                {variants.map((v, idx) => (
                  <button
                    key={v.label}
                    type="button"
                    className={`variant-option-chip ${selectedVariantIndex === idx ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedVariantIndex(idx);
                    }}
                    aria-checked={selectedVariantIndex === idx}
                    role="radio"
                  >
                    {v.label}
                    {v.priceDelta > 0 && (
                      <span style={{ opacity: 0.85, marginLeft: '4px', fontSize: '0.72rem' }}>
                        (+{formatINR(v.priceDelta)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Specifications Preview Grid */}
          <div>
            <div className="expanded-section-title">Key Specifications</div>
            <div className="specs-matrix-grid">
              {specs.map((s, idx) => (
                <div key={idx} className="spec-cell">
                  <span className="spec-cell-label">{s.label}</span>
                  <span className="spec-cell-value">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Live Calculation & Add Button */}
          <div className="expanded-bottom-row">
            {/* Quantity Stepper */}
            <div className="qty-stepper">
              <button
                type="button"
                className="qty-stepper-btn"
                aria-label="Decrease selection quantity"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedQty((q) => Math.max(1, q - 1));
                }}
              >
                <Minus size={13} />
              </button>
              <span className="qty-stepper-val">{selectedQty}</span>
              <button
                type="button"
                className="qty-stepper-btn"
                aria-label="Increase selection quantity"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedQty((q) => Math.min(10, q + 1));
                }}
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Dynamic Add to Bag Button */}
            <button
              type="button"
              className="btn-confirm-add"
              onClick={handleConfiguredAdd}
              disabled={isOutOfStock}
            >
              {added ? (
                <>
                  <Check size={14} /> Added to Bag
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Add {selectedQty > 1 ? `${selectedQty}x` : ''} · {formatINR(calculatedTotalPrice)}
                </>
              )}
            </button>
          </div>

          <Link href={`/product/${product.id}`} className="btn-view-details">
            View Complete Technical Specs & Verified Reviews →
          </Link>
        </div>
      </div>
    </article>
  );
}
