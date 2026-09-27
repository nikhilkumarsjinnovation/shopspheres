'use client';

import { useState } from 'react';

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
}

export default function ProductThumbnail({ src, alt }: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <div>No Img</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
    />
  );
}
