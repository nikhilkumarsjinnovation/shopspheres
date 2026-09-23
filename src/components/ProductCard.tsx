'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';
import * as styles from '@/app/(customer)/customer.css';

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
    seller_id?: string;
    image_urls?: string[] | null;
    stock?: number | null;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const firstImage =
    product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const stock = product.stock ?? 10;
  const isOutOfStock = stock <= 0;

  const inCart = cart.find((item) => item.id === product.id);

  const handleAdd = (e: React.MouseEvent) => {
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
    setTimeout(() => {
      setAdded(false);
    }, 1200);
  };

  return (
    <div className={styles.productCard}>
      <Link
        href={`/product/${product.id}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <div className={styles.cardImageContainer}>
          {firstImage && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstImage}
              alt={product.title}
              className={styles.cardImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.cardPlaceholderImage}>📦 Product Image</div>
          )}

          {discountPercent !== null && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              -{discountPercent}% OFF
            </span>
          )}
        </div>

        <div className={styles.cardBody}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span className={styles.cardCategory}>{product.category}</span>
            {inCart ? (
              <span style={{ fontSize: '10px', color: '#0f172a', fontWeight: 700 }}>
                In cart · {inCart.quantity}
              </span>
            ) : stock > 0 && stock <= 5 ? (
              <span style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 600 }}>
                Only {stock} left!
              </span>
            ) : null}
          </div>

          <h3 className={styles.cardTitle}>{product.title}</h3>

          {/* Star Rating summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <div style={{ color: '#f59e0b', fontSize: '13px' }}>
              {'★'.repeat(Math.round(product.average_rating || 5))}
              {'☆'.repeat(5 - Math.round(product.average_rating || 5))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              {Number(product.average_rating || 5.0).toFixed(1)}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              ({product.review_count || 0})
            </span>
          </div>

          <p className={styles.cardDescription}>{product.description}</p>

          <div className={styles.cardFooter}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span className={styles.cardPrice}>{formatINR(product.price)}</span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      textDecoration: 'line-through',
                    }}
                  >
                    M.R.P: {formatINR(product.compare_at_price)}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                Free Delivery over ₹499
              </span>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={styles.buttonAddToCart}
            >
              {isOutOfStock ? 'Sold Out' : inCart ? 'Add one more' : added ? 'Added ✓' : 'Add to Cart'}
            </button>
            {inCart ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); updateQuantity(product.id, inCart.quantity - 1); }}>-</button>
                <span>{inCart.quantity}</span>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); updateQuantity(product.id, inCart.quantity + 1); }}>+</button>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
