'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import * as styles from '@/app/(customer)/customer.css';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    seller_id: string;
    image_urls: string[];
    stock: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const firstImage =
    product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null;

  const handleAdd = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      seller_id: product.seller_id,
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
          <div className={styles.cardPlaceholderImage}>No Image</div>
        )}
      </div>

      <div className={styles.cardBody}>
        <span className={styles.cardCategory}>{product.category}</span>
        <h3 className={styles.cardTitle}>{product.title}</h3>
        <p className={styles.cardDescription}>{product.description}</p>

        <div className={styles.cardFooter}>
          <span className={styles.cardPrice}>
            ${Number(product.price).toFixed(2)}
          </span>

          <button
            type="button"
            onClick={handleAdd}
            className={styles.buttonAddToCart}
          >
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
