'use client';

import { useState } from 'react';

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
}

export default function ProductThumbnail({ src, alt }: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="product-thumb product-thumb--empty" aria-hidden>
        No Img
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="product-thumb"
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
    />
  );
}
