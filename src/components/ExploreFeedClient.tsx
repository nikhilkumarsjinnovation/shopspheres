'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ProductCard from '@/components/ProductCard';
import BehavioralOffersBanner from '@/components/BehavioralOffersBanner';
import type { FeedCarousel } from '@/app/api/v1/feed/personalized/route';
import { fetchWithCsrf } from '@/lib/csrf-client';
import * as styles from '@/app/(customer)/customer.css';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Behavioral Offers & Discounts Banner */}
      <BehavioralOffersBanner />

      {/* Top Banner / Feed Status */}
      {feedJustUpdated && (
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f2f2f2',
            border: '1px solid #111111',
            borderRadius: 0,
            color: '#111111',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          
          <span>Feed customized in real-time based on your Personal AI consultation!</span>
        </div>
      )}

      {/* Main Search & Amazon-Grade Facet Controls */}
      <div className={styles.exploreControls}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 18,
            left: 0,
            width: 4,
            height: 52,
            background: '#d6ff3a',
            borderRadius: 2,
            transform: 'skewY(-8deg)',
          }}
        />

        {/* Search Bar — spans left, AI sits offset right */}
        <div style={{ position: 'relative', gridColumn: '1 / 2' }}>
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#5a6578',
              fontSize: 16,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, category, brand, or feature..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px 16px 14px 42px',
              fontSize: 14,
              border: '1.5px solid #9aabbf',
              borderRadius: 10,
              outline: 'none',
              background: '#e8edf4',
              color: '#07101f',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#5a6578',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          className={styles.exploreAiBtn}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('shopsphere:open-ai'));
            }
          }}
          type="button"
        >
          <span>Ask Personal AI</span>
        </button>

        {/* Category Pills — full width row under */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            gridColumn: '1 / -1',
            paddingLeft: 8,
            borderLeft: '3px solid #d6ff3a',
          }}
        >
          {['All', ...availableCategories].map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid #2457ff' : '1.5px solid #c5cedc',
                  backgroundColor: isSelected ? '#2457ff' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#5a6578',
                  whiteSpace: 'nowrap',
                  transition: 'transform 140ms ease, background-color 140ms ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 12,
            borderTop: '1px solid #e8edf4',
            gridColumn: '1 / -1',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#5a6578', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Price</span>
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                style={{
                  width: 74,
                  padding: '7px 8px',
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1.5px solid #9aabbf',
                  background: '#ffffff',
                }}
              />
              <span style={{ fontSize: 12, color: '#7a8699' }}>–</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  width: 74,
                  padding: '7px 8px',
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1.5px solid #9aabbf',
                  background: '#ffffff',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#5a6578', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Rating</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                style={{
                  padding: '7px 10px',
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1.5px solid #9aabbf',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value={0}>All Ratings</option>
                <option value={4}>4★ & above</option>
                <option value={3}>3★ & above</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#07101f' }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#2457ff' }}
              />
              In Stock Only
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#5a6578', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '7px 10px',
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1.5px solid #9aabbf',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Avg. Customer Review</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>

            {isFiltering && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  background: '#dce6ff',
                  border: '1.5px solid #2457ff',
                  borderRadius: 8,
                  color: '#2457ff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 10px',
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: ACTIVE FILTER / SEARCH RESULTS */}
      {isFiltering ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111111', margin: '0 0 4px 0' }}>
                Search Results
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#737373' }}>
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} matching your criteria
              </p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#111111', margin: '0 0 0.5rem 0' }}>
                No products match your filters
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem' }}>
                Try adjusting your search terms, expanding the price range, or clearing category selections.
              </p>
              <button
                onClick={handleClearFilters}
                className={styles.buttonAddToCart}
                style={{ display: 'inline-block' }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: PERSONALIZED AI DYNAMIC FEED CAROUSELS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {isPersonalized && feedSummary && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                backgroundColor: '#07101f',
                borderRadius: 12,
                border: '1px solid #243048',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: '#d6ff3a',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: '#8a96ab', fontWeight: 500 }}>
                  {feedSummary}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#07101f',
                  backgroundColor: '#d6ff3a',
                  padding: '4px 10px',
                  borderRadius: 999,
                }}
              >
                Dynamic AI Active
              </span>
            </div>
          )}

          {feedLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8a8a8a' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></div>
              <p>Analyzing catalog and tailoring your personalized marketplace feed...</p>
            </div>
          ) : carousels.length === 0 ? (
            /* Fallback to standard product grid if carousels empty */
            <div className={styles.productGrid}>
              {initialProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            carousels.map((carousel) => (
              <div key={carousel.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111111', margin: 0 }}>
                        {carousel.title}
                      </h2>
                      {carousel.badge && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#047857',
                            backgroundColor: '#e6e6e6',
                            padding: '2px 8px',
                            borderRadius: 0,
                          }}
                        >
                          {carousel.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#737373' }}>
                      {carousel.subtitle}
                    </p>
                  </div>
                </div>

                <div className={styles.productGrid}>
                  {carousel.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
