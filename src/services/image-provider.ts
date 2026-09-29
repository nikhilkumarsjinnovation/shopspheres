/**
 * Image Provider Abstraction and Resolution Pipeline for Dummy Data Generation
 *
 * Implements:
 * 1. ImageProvider interface for modular, pluggable providers.
 * 2. PexelsImageProvider (optional, configurable fallback with rate-limit & auth resilience).
 * 3. PlaceholderImageProvider (reliable, high-availability category fallback).
 * 4. In-memory NormalizedQueryCache to avoid redundant external network requests.
 * 5. Unified ImageResolver orchestrating priority: randomapi -> pexels -> placeholder -> none.
 */

export type ImageSource = 'randomapi' | 'pexels' | 'placeholder' | 'none';

export interface ResolvedImageResult {
  imageUrl: string | null;
  imageSource: ImageSource;
}

export interface ImageProvider {
  getProviderName(): string;
  isAvailable(): boolean;
  resolveImage(query: string, index?: number): Promise<string | null>;
  searchImages(query: string, perPage?: number): Promise<string[]>;
}

/**
 * Normalizes query string for caching and deduplication.
 * e.g., " Wireless Gaming Mouse " -> "wireless gaming mouse"
 */
export function normalizeSearchKey(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/-+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates whether a string is a well-formed HTTP/HTTPS image URL.
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Simple in-memory cache with TTL for image queries.
 */
export class NormalizedQueryCache {
  private cache = new Map<string, { images: string[]; expiresAt: number }>();
  private defaultTtlMs: number;

  constructor(ttlMinutes = 60) {
    this.defaultTtlMs = ttlMinutes * 60 * 1000;
  }

  get(key: string): string[] | null {
    const normalized = normalizeSearchKey(key);
    const entry = this.cache.get(normalized);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(normalized);
      return null;
    }
    return entry.images;
  }

  set(key: string, images: string[], ttlMs?: number): void {
    const normalized = normalizeSearchKey(key);
    this.cache.set(normalized, {
      images,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global shared cache instance for the application lifecycle
export const globalImageQueryCache = new NormalizedQueryCache(120);

/**
 * Reliable category-based placeholder images from curated CDN collections
 * (Unsplash high-speed CDN assets matching ShopSphere marketplace departments)
 */
export const CATEGORY_PLACEHOLDERS: Record<string, string[]> = {
  electronics: [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
  ],
  clothing: [
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80',
  ],
  home: [
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
  ],
  food: [
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608248597359-2e0618032483?w=800&auto=format&fit=crop&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&auto=format&fit=crop&q=80',
  ],
  general: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  ],
};

/**
 * Fallback provider offering zero-network-dependency, high-speed verified images.
 */
export class PlaceholderImageProvider implements ImageProvider {
  getProviderName(): string {
    return 'placeholder';
  }

  isAvailable(): boolean {
    return true;
  }

  async resolveImage(categoryOrKeyword: string, index = 0): Promise<string | null> {
    const key = normalizeSearchKey(categoryOrKeyword);
    const pool =
      CATEGORY_PLACEHOLDERS[key] ||
      CATEGORY_PLACEHOLDERS[key.split(' ')[0] || ''] ||
      CATEGORY_PLACEHOLDERS.general;

    const safeIndex = Math.abs(index) % pool.length;
    return pool[safeIndex] || null;
  }

  async searchImages(query: string, perPage = 5): Promise<string[]> {
    const key = normalizeSearchKey(query);
    const pool =
      CATEGORY_PLACEHOLDERS[key] ||
      CATEGORY_PLACEHOLDERS[key.split(' ')[0] || ''] ||
      CATEGORY_PLACEHOLDERS.general;
    return pool.slice(0, perPage);
  }
}

/**
 * Pexels Image Provider
 * Optional, server-side external provider with query caching, rate limit resilience, and bounded timeouts.
 */
export class PexelsImageProvider implements ImageProvider {
  private apiKey: string | null;
  private cache: NormalizedQueryCache;
  private isSuspended = false;
  private suspendedUntil = 0;

  constructor(apiKey?: string, cache: NormalizedQueryCache = globalImageQueryCache) {
    this.apiKey = apiKey || process.env.PEXELS_API_KEY || null;
    this.cache = cache;
  }

  getProviderName(): string {
    return 'pexels';
  }

  isAvailable(): boolean {
    if (!this.apiKey) return false;
    if (this.isSuspended && Date.now() < this.suspendedUntil) {
      return false;
    }
    if (this.isSuspended && Date.now() >= this.suspendedUntil) {
      this.isSuspended = false;
    }
    return true;
  }

  /**
   * Search Pexels photos with query normalization and caching.
   */
  async searchImages(query: string, perPage = 15): Promise<string[]> {
    if (!this.isAvailable()) return [];

    const normKey = normalizeSearchKey(query);
    const cached = this.cache.get(normKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(normKey)}&per_page=${perPage}&orientation=landscape`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, {
        headers: {
          Authorization: this.apiKey!,
          'User-Agent': 'ShopSphere-DataGen/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        console.warn('[PexelsImageProvider] Invalid PEXELS_API_KEY. Disabling Pexels provider.');
        this.isSuspended = true;
        this.suspendedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24h
        return [];
      }

      if (res.status === 429) {
        console.warn('[PexelsImageProvider] Rate limit hit (429). Temporarily suspending Pexels provider for 5 minutes.');
        this.isSuspended = true;
        this.suspendedUntil = Date.now() + 5 * 60 * 1000; // 5 min
        return [];
      }

      if (!res.ok) {
        console.warn(`[PexelsImageProvider] HTTP error ${res.status}`);
        return [];
      }

      const json = await res.json();
      const photos: Array<{ src?: { medium?: string; large?: string; original?: string } }> =
        json.photos || [];

      const urls = photos
        .map((p) => p.src?.medium || p.src?.large || p.src?.original || '')
        .filter((u) => isValidImageUrl(u));

      if (urls.length > 0) {
        this.cache.set(normKey, urls);
      }

      return urls;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[PexelsImageProvider] Failed to fetch Pexels photos:', message);
      return [];
    }
  }

  /**
   * Resolves a single image deterministically from the search result pool.
   */
  async resolveImage(query: string, index = 0): Promise<string | null> {
    const urls = await this.searchImages(query, 15);
    if (!urls || urls.length === 0) return null;
    const safeIndex = Math.abs(index) % urls.length;
    return urls[safeIndex] || null;
  }
}

/**
 * Unified Image Resolver
 *
 * Implements the required 4-stage resolution pipeline:
 * 1. Use RandomAPI's imageUrl if present and valid.
 * 2. If missing/empty/invalid: attempt the configured fallback provider (Pexels).
 * 3. If fallback provider fails or is unconfigured: use application's high-availability category placeholder.
 * 4. Otherwise leave null without failing the overall dummy data generation operation.
 */
export class ImageResolver {
  private pexelsProvider: PexelsImageProvider;
  private placeholderProvider: PlaceholderImageProvider;
  private fallbackEnabled: boolean;
  private providerMode: string;

  constructor(options?: {
    pexelsApiKey?: string;
    fallbackEnabled?: boolean;
    providerMode?: string;
    cache?: NormalizedQueryCache;
  }) {
    const cache = options?.cache || globalImageQueryCache;
    this.pexelsProvider = new PexelsImageProvider(options?.pexelsApiKey, cache);
    this.placeholderProvider = new PlaceholderImageProvider();
    this.fallbackEnabled = options?.fallbackEnabled ?? (process.env.DUMMY_IMAGE_FALLBACK_ENABLED !== 'false');
    this.providerMode = options?.providerMode || process.env.DUMMY_IMAGE_PROVIDER || 'auto';
  }

  /**
   * Resolves an image for a generated product candidate.
   *
   * @param candidateImageUrl - The imageUrl returned by RandomAPI.
   * @param category - Category name (e.g. "electronics", "beauty").
   * @param productTitle - Product title for specific keyword fallback.
   * @param productIndex - Index for deterministic modulo rotation.
   */
  async resolveProductImage({
    candidateImageUrl,
    category,
    productTitle,
    productIndex = 0,
  }: {
    candidateImageUrl?: string | null;
    category: string;
    productTitle: string;
    productIndex?: number;
  }): Promise<ResolvedImageResult> {
    // 1. Primary: Use RandomAPI imageUrl if valid and usable
    if (isValidImageUrl(candidateImageUrl)) {
      return {
        imageUrl: candidateImageUrl!.trim(),
        imageSource: 'randomapi',
      };
    }

    // If fallback is explicitly disabled, return none
    if (!this.fallbackEnabled || this.providerMode === 'none') {
      return {
        imageUrl: null,
        imageSource: 'none',
      };
    }

    // 2. Secondary: Attempt Pexels fallback if available
    if (this.pexelsProvider.isAvailable() && this.providerMode !== 'placeholder') {
      // Group search by category or key phrase to avoid 1-per-product quota exhaustion
      const searchKey = category || productTitle;
      const pexelsUrl = await this.pexelsProvider.resolveImage(searchKey, productIndex);
      if (isValidImageUrl(pexelsUrl)) {
        return {
          imageUrl: pexelsUrl!,
          imageSource: 'pexels',
        };
      }
    }

    // 3. Tertiary: High-availability Category Placeholder Image
    try {
      const placeholderUrl = await this.placeholderProvider.resolveImage(category, productIndex);
      if (isValidImageUrl(placeholderUrl)) {
        return {
          imageUrl: placeholderUrl!,
          imageSource: 'placeholder',
        };
      }
    } catch {
      // Ignore placeholder lookup error
    }

    // 4. Final: None (Never fails the complete dummy data generation request)
    return {
      imageUrl: null,
      imageSource: 'none',
    };
  }
}
