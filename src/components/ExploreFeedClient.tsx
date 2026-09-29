'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, SlidersHorizontal, RefreshCw, RotateCcw, Check } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import type { FeedCarousel } from '@/app/api/v1/feed/personalized/route';
import { fetchWithCsrf } from '@/lib/csrf-client';

export interface BaseProduct {
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
}

interface ExploreFeedClientProps {
  initialProducts: BaseProduct[];
  availableCategories: string[];
}

/** Hide backend ranker internals (model names, versions) from shoppers. */
function friendlySubtitle(subtitle?: string | null): string | null {
  if (!subtitle) return null;
  if (subtitle.trim().toLowerCase() === 'diverse picks from your recent behavior') {
    return null;
  }
  if (/@|category_affinity|ltr|ranker/i.test(subtitle)) {
    return 'Handpicked from your recent browsing';
  }
  return subtitle;
}

export default function ExploreFeedClient({
  initialProducts,
  availableCategories,
}: ExploreFeedClientProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Three-pane selection — right detail panel (no page jump for specs)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Listen for search from header
  useEffect(() => {
    const handleHeaderSearch = (e: any) => {
      setSearchQuery(e.detail?.query || '');
    };
    window.addEventListener('shopsphere:header-search', handleHeaderSearch);
    return () => window.removeEventListener('shopsphere:header-search', handleHeaderSearch);
  }, []);

  // AI Personalized Feed State (summary banner intentionally not rendered)
  const [carousels, setCarousels] = useState<FeedCarousel[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedJustUpdated, setFeedJustUpdated] = useState(false);

  // Fetch Personalized Feed
  const fetchPersonalizedFeed = useCallback(async () => {
    try {
      setFeedLoading(true);
      const res = await fetchWithCsrf('/api/v1/feed/personalized');
      if (res.ok) {
        const data = await res.json();
        setCarousels(data.carousels || []);
      }
    } catch (err) {
      console.error('Failed to load personalized feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonalizedFeed();

    // Listen to real-time AI updates from PersonalAiAssistant
    const handleFeedUpdated = () => {
      setFeedJustUpdated(true);
      fetchPersonalizedFeed();
      setTimeout(() => setFeedJustUpdated(false), 4000);
    };

    window.addEventListener('shopsphere:feed-updated', handleFeedUpdated);
    return () => {
      window.removeEventListener('shopsphere:feed-updated', handleFeedUpdated);
    };
  }, [fetchPersonalizedFeed]);

  // Lock body scroll when a mobile overlay is open
  useEffect(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1180px)').matches;
    const lock = mobileFiltersOpen || (selectedId !== null && isMobile);
    document.body.style.overflow = lock ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen, selectedId]);

  // Per-category counts for the sidebar list
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of initialProducts) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return counts;
  }, [initialProducts]);

  const maxCatalogPrice = useMemo(() => {
    return initialProducts.reduce((m, p) => Math.max(m, p.price || 0), 0);
  }, [initialProducts]);

  // Determine if user has active filters
  const isFiltering = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedCategory !== 'All' ||
      minPrice !== '' ||
      maxPrice !== '' ||
      minRating > 0 ||
      inStockOnly ||
      sortBy !== 'featured'
    );
  }, [searchQuery, selectedCategory, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchQuery.trim() !== '') n += 1;
    if (selectedCategory !== 'All') n += 1;
    if (minPrice !== '' || maxPrice !== '') n += 1;
    if (minRating > 0) n += 1;
    if (inStockOnly) n += 1;
    if (sortBy !== 'featured') n += 1;
    return n;
  }, [searchQuery, selectedCategory, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('featured');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopsphere:clear-header-search'));
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const descMatch = p.description.toLowerCase().includes(q);
        const catMatch = p.category.toLowerCase().includes(q);
        const tagsMatch = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || descMatch || catMatch || tagsMatch;
      });
    }

    // Category
    if (selectedCategory !== 'All') {
      result = result.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Price
    if (minPrice !== '') {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p) => p.price >= min);
      }
    }
    if (maxPrice !== '') {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p) => p.price <= max);
      }
    }

    // Rating
    if (minRating > 0) {
      result = result.filter((p) => (p.average_rating || 5) >= minRating);
    }

    // In Stock Only
    if (inStockOnly) {
      result = result.filter((p) => (p.stock ?? 10) > 0);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'newest') {
      result.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return result;
  }, [initialProducts, searchQuery, selectedCategory, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  // Lookup across catalog + AI carousels so selection survives view switches
  const productLookup = useMemo(() => {
    const map = new Map<string, BaseProduct>();
    for (const p of initialProducts) map.set(p.id, p);
    for (const c of carousels) {
      for (const p of c.products || []) {
        if (!map.has(p.id)) map.set(p.id, p as BaseProduct);
      }
    }
    return map;
  }, [initialProducts, carousels]);

  const selectedProduct = selectedId ? productLookup.get(selectedId) ?? null : null;

  // Desktop: keep a selection alive (first visible product) so the pane never sits empty
  const visiblePool = isFiltering ? filteredProducts : initialProducts;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1181px)').matches) return;
    if (visiblePool.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visiblePool.some((p) => p.id === selectedId)) {
      setSelectedId(visiblePool[0].id);
    }
  }, [visiblePool, selectedId, isFiltering]);

  const filterPanel = (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <span className="filter-panel-title">
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-count-pill">{activeFilterCount}</span>
          )}
        </span>
        {isFiltering && (
          <button type="button" className="btn-reset-filters" onClick={handleClearFilters}>
            <RotateCcw size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
            Reset
          </button>
        )}
      </div>

      {/* Category */}
      <div className="filter-section">
        <h4 className="filter-section-title">Category</h4>
        <div className="filter-cat-list" role="radiogroup" aria-label="Filter by category">
          {['All', ...availableCategories].map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            const count = cat === 'All' ? initialProducts.length : (categoryCounts.get(cat) ?? 0);
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`filter-cat-item ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span className="filter-cat-dot" aria-hidden />
                <span className="filter-cat-name">{cat === 'All' ? 'All products' : cat}</span>
                <span className="filter-cat-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div className="filter-section">
        <h4 className="filter-section-title">Price range</h4>
        <div className="filter-price-row">
          <input
            type="number"
            placeholder="Min ₹"
            className="price-mini-input filter-price-input"
            value={minPrice}
            min={0}
            onChange={(e) => setMinPrice(e.target.value)}
            aria-label="Minimum price in INR"
          />
          <span className="filter-price-dash" aria-hidden>–</span>
          <input
            type="number"
            placeholder={maxCatalogPrice > 0 ? `Max ₹${Math.round(maxCatalogPrice).toLocaleString('en-IN')}` : 'Max ₹'}
            className="price-mini-input filter-price-input"
            value={maxPrice}
            min={0}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Maximum price in INR"
          />
        </div>
        <div className="filter-quick-prices">
          {[
            { label: 'Under ₹500', min: '', max: '500' },
            { label: '₹500–2k', min: '500', max: '2000' },
            { label: '₹2k+', min: '2000', max: '' },
          ].map((chip) => {
            const active = minPrice === chip.min && maxPrice === chip.max;
            return (
              <button
                key={chip.label}
                type="button"
                className={`filter-chip ${active ? 'active' : ''}`}
                onClick={() => {
                  setMinPrice(active ? '' : chip.min);
                  setMaxPrice(active ? '' : chip.max);
                }}
              >
                {active && <Check size={11} />}
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rating */}
      <div className="filter-section">
        <h4 className="filter-section-title">Customer rating</h4>
        <div className="filter-chip-row" role="radiogroup" aria-label="Minimum customer rating">
          {[
            { value: 0, label: 'Any' },
            { value: 3, label: '3★+' },
            { value: 4, label: '4★+' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={minRating === opt.value}
              className={`filter-chip ${minRating === opt.value ? 'active' : ''}`}
              onClick={() => setMinRating(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="filter-section">
        <h4 className="filter-section-title">Availability</h4>
        <button
          type="button"
          role="switch"
          aria-checked={inStockOnly}
          className={`filter-switch-row ${inStockOnly ? 'on' : ''}`}
          onClick={() => setInStockOnly((v) => !v)}
        >
          <span className="filter-switch" aria-hidden>
            <span className="filter-switch-knob" />
          </span>
          <span>In stock only</span>
        </button>
      </div>

      {/* Sort */}
      <div className="filter-section" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
        <h4 className="filter-section-title">Sort by</h4>
        <select
          className="custom-select filter-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          aria-label="Sort products by"
        >
          <option value="featured">Featured / Best Match</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Highest Customer Rating</option>
          <option value="newest">Newest Arrivals</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="explore-shell animate-slide-up">
      {/* Mobile filter trigger */}
      <div className="explore-mobile-bar">
        <button
          type="button"
          className="btn-mobile-filters"
          onClick={() => setMobileFiltersOpen(true)}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-count-pill">{activeFilterCount}</span>
          )}
        </button>
        <div className="explore-mobile-meta">
          {isFiltering ? (
            <span>{filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'}</span>
          ) : (
            <span>{initialProducts.length} products</span>
          )}
        </div>
        <button
          type="button"
          className="btn-ai-guide"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('shopsphere:open-ai'));
            }
          }}
        >
          <Sparkles size={14} />
          <span>AI Assistant</span>
        </button>
      </div>

      {/* LEFT RAIL — sticky filters (desktop) */}
      <aside className="explore-rail explore-rail-left" aria-label="Catalog filters">
        <div className="rail-card">{filterPanel}</div>
      </aside>

      {/* CENTER — search + feed */}
      <div className="explore-main">
        {/* Real-time AI consultation update notice */}
        {feedJustUpdated && (
          <div className="feed-updated-notice">
            <Sparkles size={16} />
            <span>Catalog tailored in real-time based on your Personal AI consultation!</span>
          </div>
        )}

        {/* Result meta — only rendered while filtering (no empty bar otherwise) */}
        {isFiltering && (
          <div className="feed-filter-bar explore-search-card" style={{ padding: '0.75rem 1.25rem' }}>
            <div className="explore-result-meta" style={{ borderTop: 'none', paddingTop: 0 }}>
              <span>
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                {searchQuery.trim() && <> for <strong>{searchQuery.trim()}</strong></>}
              </span>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: ACTIVE FILTER / SEARCH RESULTS */}
        {isFiltering ? (
          <section style={{ marginBottom: '3rem' }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">Search &amp; Filtered Results</h2>
                <p className="section-subtitle">
                  Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} matching your current criteria
                </p>
              </div>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleClearFilters}
              >
                Clear all filters
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="explore-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  No products match your filters
                </h3>
                <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', color: 'var(--fg-muted)' }}>
                  Try adjusting your search terms, expanding the price range, or clearing selected category filters.
                </p>
                <button
                  type="button"
                  className="btn-card-add"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                  onClick={handleClearFilters}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="product-list">
                {filteredProducts.map((product, i) => (
                  <div key={product.id} className="explore-card-enter" style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}>
                    <ProductCard
                      product={product}
                      onPreview={(p) => setSelectedId(p.id)}
                      isSelected={product.id === selectedId}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* VIEW 2: PERSONALIZED AI DYNAMIC FEED CAROUSELS */
          <div>
            {feedLoading ? (
              <div>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Curating your feed</h2>
                    <p className="section-subtitle">Analyzing the catalog for picks you’ll love…</p>
                  </div>
                </div>
                <div className="product-grid" aria-hidden>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="explore-skeleton-card">
                      <div className="explore-skeleton-media" />
                      <div className="explore-skeleton-line wide" />
                      <div className="explore-skeleton-line" />
                      <div className="explore-skeleton-line short" />
                    </div>
                  ))}
                </div>
                <p className="explore-loading-note">
                  <RefreshCw size={14} className="pulse-badge" />
                  Analyzing catalog and curating your personalized marketplace feed...
                </p>
              </div>
            ) : carousels.length === 0 ? (
              /* Fallback to standard product grid if carousels empty */
              <div>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Explore Catalog</h2>
                    <p className="section-subtitle">Browse curated products across all categories</p>
                  </div>
                </div>
                <div className="product-list">
                  {initialProducts.map((product, i) => (
                    <div key={product.id} className="explore-card-enter" style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}>
                      <ProductCard
                        product={product}
                        onPreview={(p) => setSelectedId(p.id)}
                        isSelected={product.id === selectedId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              carousels.map((carousel) => {
                const subtitle = friendlySubtitle(carousel.subtitle);
                const badge =
                  carousel.badge && !/^(ranked|for you)$/i.test(carousel.badge.trim())
                    ? carousel.badge
                    : null;
                return (
                  <section key={carousel.id} style={{ marginBottom: '3rem' }}>
                    <div className="section-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <h2 className="section-title">{carousel.title}</h2>
                          {badge && (
                            <span className="section-badge">{badge}</span>
                          )}
                        </div>
                        {subtitle && (
                          <p className="section-subtitle">{subtitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="product-list">
                      {carousel.products.map((product, i) => (
                        <div key={product.id} className="explore-card-enter" style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}>
                          <ProductCard
                            product={product}
                            onPreview={(p: any) => setSelectedId(p.id)}
                            isSelected={product.id === selectedId}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANE — sticky detail panel (specs without page jumps) */}
      {selectedProduct && (
        <div
          className="detail-backdrop"
          onClick={() => setSelectedId(null)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`explore-detail ${selectedProduct ? 'open' : ''}`}
        aria-label="Product details"
      >
        <ProductDetailPanel
          key={selectedProduct?.id ?? 'empty'}
          product={selectedProduct}
          onClose={() => setSelectedId(null)}
        />
      </aside>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="mobile-filter-overlay" role="dialog" aria-modal="true" aria-label="Catalog filters">
          <div className="mobile-filter-backdrop" onClick={() => setMobileFiltersOpen(false)} />
          <div className="mobile-filter-sheet animate-slide-up">
            <div className="mobile-filter-grabber" aria-hidden />
            <div className="mobile-filter-actions">
              <button type="button" className="btn-reset-filters" onClick={handleClearFilters}>
                Reset all
              </button>
              <button
                type="button"
                className="btn-card-add"
                style={{ padding: '0.6rem 1.4rem' }}
                onClick={() => setMobileFiltersOpen(false)}
              >
                Show {filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'}
              </button>
            </div>
            <div className="mobile-filter-scroll">{filterPanel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
