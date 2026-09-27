'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import BehavioralOffersBanner from '@/components/BehavioralOffersBanner';
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

  // AI Personalized Feed State
  const [carousels, setCarousels] = useState<FeedCarousel[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [feedSummary, setFeedSummary] = useState<string>('');
  const [feedJustUpdated, setFeedJustUpdated] = useState(false);

  // Fetch Personalized Feed
  const fetchPersonalizedFeed = useCallback(async () => {
    try {
      setFeedLoading(true);
      const res = await fetchWithCsrf('/api/v1/feed/personalized');
      if (res.ok) {
        const data = await res.json();
        setCarousels(data.carousels || []);
        setIsPersonalized(Boolean(data.personalized));
        setFeedSummary(data.summary || '');
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

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('featured');
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

  return (
    <div className="animate-slide-up">
      {/* Top Behavioral Offers Banner */}
      <BehavioralOffersBanner />

      {/* Real-time AI consultation update notice */}
      {feedJustUpdated && (
        <div
          style={{
            margin: '1rem 0',
            padding: '0.85rem 1.25rem',
            background: 'var(--accent-glow)',
            border: '1px solid rgba(79, 70, 229, 0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--accent-electric)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <Sparkles size={16} />
          <span>Catalog tailored in real-time based on your Personal AI consultation!</span>
        </div>
      )}

      {/* Main Search & Facet Control Hub */}
      <div className="feed-filter-bar">
        {/* Row 1: Search Input & AI Trigger */}
        <div className="search-row">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 300+ items by name, category, brand, or feature..."
              aria-label="Search marketplace catalog"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search input"
              >
                <X size={16} />
              </button>
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

        {/* Row 2: Category Filter Pills */}
        <div className="category-pills-row" role="tablist" aria-label="Product categories">
          {['All', ...availableCategories].map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`category-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Row 3: Facet Controls Row (Price, Rating, Stock, Sorting) */}
        <div className="facets-row">
          <div className="facets-group">
            {/* Price Range */}
            <div className="filter-input-chip">
              <span>Price:</span>
              <input
                type="number"
                placeholder="Min ₹"
                className="price-mini-input"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                aria-label="Minimum price in INR"
              />
              <span>–</span>
              <input
                type="number"
                placeholder="Max ₹"
                className="price-mini-input"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                aria-label="Maximum price in INR"
              />
            </div>

            {/* Minimum Rating */}
            <div className="filter-input-chip">
              <span>Rating:</span>
              <select
                className="custom-select"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                aria-label="Minimum customer rating"
              >
                <option value={0}>All Ratings</option>
                <option value={4}>4★ & above</option>
                <option value={3}>3★ & above</option>
              </select>
            </div>

            {/* In Stock Only Checkbox */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--fg-primary)' }}
              />
              In Stock Only
            </label>
          </div>

          <div className="facets-group">
            {/* Sort Dropdown */}
            <div className="filter-input-chip">
              <span>Sort:</span>
              <select
                className="custom-select"
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

            {isFiltering && (
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: ACTIVE FILTER / SEARCH RESULTS */}
      {isFiltering ? (
        <section style={{ marginBottom: '3rem' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Search & Filtered Results</h2>
              <p className="section-subtitle">
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} matching your current criteria
              </p>
            </div>
            {isFiltering && (
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleClearFilters}
              >
                Clear all filters
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-subtle)',
              }}
            >
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
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* VIEW 2: PERSONALIZED AI DYNAMIC FEED CAROUSELS */
        <div>
          {isPersonalized && feedSummary && (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1rem 1.5rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-electric)' }} />
                <span style={{ fontSize: '0.925rem', fontWeight: 600 }}>{feedSummary}</span>
              </div>
              <span className="section-badge">Dynamic AI Feed Active</span>
            </div>
          )}

          {feedLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <RefreshCw size={24} className="pulse-badge" style={{ margin: '0 auto 1rem', color: 'var(--fg-muted)' }} />
              <p style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>
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
              <div className="product-grid">
                {initialProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : (
            carousels.map((carousel) => (
              <section key={carousel.id} style={{ marginBottom: '3.5rem' }}>
                <div className="section-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h2 className="section-title">{carousel.title}</h2>
                      {carousel.badge && (
                        <span className="section-badge">{carousel.badge}</span>
                      )}
                    </div>
                    {carousel.subtitle && (
                      <p className="section-subtitle">{carousel.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="product-grid">
                  {carousel.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}
