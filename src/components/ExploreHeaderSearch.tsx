'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function ExploreHeaderSearch() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleClear = () => setQuery('');
    window.addEventListener('shopsphere:clear-header-search', handleClear);
    return () => window.removeEventListener('shopsphere:clear-header-search', handleClear);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopsphere:header-search', { detail: { query: value } }));
    }
  };

  const handleClear = () => {
    setQuery('');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopsphere:header-search', { detail: { query: '' } }));
    }
  };

  return (
    <div className="explore-header-search">
      <div className="search-input-wrap" style={{ flex: 1 }}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={handleChange}
          placeholder="Search 300+ items by name, category, brand, or feature..."
          aria-label="Search marketplace catalog"
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search input"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}