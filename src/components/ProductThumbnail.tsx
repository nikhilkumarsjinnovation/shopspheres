'use client';

import { useState } from 'react';
import styles from '@/app/seller/seller.module.css';

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
}

export default function ProductThumbnail({ src, alt }: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <div className={styles.placeholderThumb}>No Img</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={styles.productThumb}
      onError={() => setHasError(true)}
    />
  );
}
