'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    <div>
      {/* Top Behavioral Offers & Discounts Banner */}
      <BehavioralOffersBanner />

      {/* Top Banner / Feed Status */}
      {feedJustUpdated && (
        <div
        >
          
          <span>Feed customized in real-time based on your Personal AI consultation!</span>
        </div>
      )}

      {/* Main Search & Amazon-Grade Facet Controls */}
      <div>
        <div
          aria-hidden
        />

        {/* Search Bar — spans left, AI sits offset right */}
        <div>
          <span
          >
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, category, brand, or feature..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <button
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
        >
          {['All', ...availableCategories].map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div
        >
          <div>
            <div>
              <span>Price</span>
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <div>
              <span>Rating</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>All Ratings</option>
                <option value={4}>4★ & above</option>
                <option value={3}>3★ & above</option>
              </select>
            </div>

            <label>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              In Stock Only
            </label>
          </div>

          <div>
            <div>
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
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
          <div>
            <div>
              <h2>
                Search Results
              </h2>
              <p>
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} matching your criteria
              </p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div>
              <div>🔍</div>
              <h3>
                No products match your filters
              </h3>
              <p>
                Try adjusting your search terms, expanding the price range, or clearing category selections.
              </p>
              <button
                onClick={handleClearFilters}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: PERSONALIZED AI DYNAMIC FEED CAROUSELS */
        <div>
          {isPersonalized && feedSummary && (
            <div
            >
              <div>
                <span
                />
                <span>
                  {feedSummary}
                </span>
              </div>
              <span
              >
                Dynamic AI Active
              </span>
            </div>
          )}

          {feedLoading ? (
            <div>
              <div></div>
              <p>Analyzing catalog and tailoring your personalized marketplace feed...</p>
            </div>
          ) : carousels.length === 0 ? (
            /* Fallback to standard product grid if carousels empty */
            <div>
              {initialProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            carousels.map((carousel) => (
              <div key={carousel.id}>
                <div>
                  <div>
                    <div>
                      <h2>
                        {carousel.title}
                      </h2>
                      {carousel.badge && (
                        <span
                        >
                          {carousel.badge}
                        </span>
                      )}
                    </div>
                    <p>
                      {carousel.subtitle}
                    </p>
                  </div>
                </div>

                <div>
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
