'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageOff, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/formatters';
import * as styles from '@/app/(customer)/customer.css';
import { badge, badgeTone } from '@/styles/ui.css';

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
  const rating = Number(product.average_rating || 0);

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
    setTimeout(() => setAdded(false), 900);
  };

  return (
    <article className={styles.productCard}>
      <Link
        href={`/product/${product.id}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <div className={styles.cardImageContainer}>
          {firstImage && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstImage}
              alt=""
              className={styles.cardImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.cardPlaceholderImage}>
              <ImageOff size={20} strokeWidth={1.5} aria-hidden />
              No image
            </div>
          )}
          {discountPercent !== null ? (
            <span className={`${badge} ${badgeTone.accent}`} style={{ position: 'absolute', top: 0, left: 0 }}>
              −{discountPercent}%
            </span>
          ) : null}
          {inCart ? (
            <span className={`${badge} ${badgeTone.neutral}`} style={{ position: 'absolute', top: 0, right: 0 }}>
              {inCart.quantity} in bag
            </span>
          ) : null}
        </div>

        <div className={styles.cardBody}>
          <span className={styles.cardCategory}>{product.category}</span>
          <h3 className={styles.cardTitle}>{product.title}</h3>
          {rating > 0 ? (
            <p className={styles.listMeta} style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {rating.toFixed(1)} · {product.review_count || 0} reviews
            </p>
          ) : null}
          {!inCart && stock > 0 && stock <= 5 ? (
            <p className={styles.listMeta} style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Only {stock} left
            </p>
          ) : null}

          <div className={styles.cardFooter}>
            <div>
              <span className={styles.cardPrice}>{formatINR(product.price)}</span>
              {product.compare_at_price && product.compare_at_price > product.price ? (
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#737373', textDecoration: 'line-through' }}>
                  {formatINR(product.compare_at_price)}
                </span>
              ) : null}
            </div>

            {inCart ? (
              <div className={styles.qtyControl} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                <button type="button" className={styles.qtyButton} aria-label="Decrease" onClick={() => updateQuantity(product.id, inCart.quantity - 1)}>
                  <Minus size={14} />
                </button>
                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600, fontSize: '0.8rem' }}>{inCart.quantity}</span>
                <button type="button" className={styles.qtyButton} aria-label="Increase" onClick={() => updateQuantity(product.id, inCart.quantity + 1)}>
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={handleAdd} disabled={isOutOfStock} className={styles.buttonAddToCart}>
                {isOutOfStock ? 'Sold out' : added ? 'Added' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
