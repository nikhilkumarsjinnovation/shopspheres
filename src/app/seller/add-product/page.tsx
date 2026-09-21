'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Separator from '@radix-ui/react-separator';
import { createClient } from '@/lib/supabase/client';
import type { CategoryResponse } from '@/lib/validations/ai';
import * as styles from '../seller.css';
import layoutStyles from '../seller.module.css';

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createClient();

  // Basic Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // AI Categorization & Taxonomy
  const [category, setCategory] = useState('General');
  const [subCategory, setSubCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [isAiCategorized, setIsAiCategorized] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-Categorize with AI
  const handleAutoCategorize = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a product title before running AI Auto-Categorization.');
      return;
    }

    setAiLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-categorize product.');
      }

      const aiResult = data as CategoryResponse;

      // Automatically populate taxonomy fields
      setCategory(aiResult.category);
      setSubCategory(aiResult.sub_category);
      setTagsInput(aiResult.tags.join(', '));
      setAiConfidence(aiResult.confidence);
      setIsAiCategorized(true);

      setSuccessMessage(
        `AI successfully categorized this product as "${aiResult.category} > ${aiResult.sub_category}" with ${(
          aiResult.confidence * 100
        ).toFixed(0)}% confidence!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI categorization failed. Please select a category manually.';
      setErrorMessage(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Fetch authenticated user session to guarantee authentic seller_id
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage('Authentication error. Please sign in again.');
        setLoading(false);
        return;
      }

      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setErrorMessage('Please enter a valid non-negative price.');
        setLoading(false);
        return;
      }

      // Process tags array
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // 2. Insert into Supabase products table with authenticated seller_id
      const { data: insertedProduct, error: insertError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id, // CRITICAL: Populated with current logged-in user's auth.uid()
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          category: category.trim() || 'General',
          sub_category: subCategory.trim() || null,
          tags: parsedTags,
          ai_categorized: isAiCategorized,
          image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
          is_published: true,
          stock: 10,
        })
        .select()
        .single();

      if (insertError) {
        setErrorMessage(insertError.message);
        setLoading(false);
        return;
      }

      setSuccessMessage(`Product "${insertedProduct.title}" has been successfully added to your inventory!`);

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setCategory('General');
      setSubCategory('');
      setTagsInput('');
      setAiConfidence(null);
      setIsAiCategorized(false);
      setLoading(false);

      // Redirect after brief delay to inventory dashboard
      setTimeout(() => {
        router.push('/seller/dashboard');
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while adding the product.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <header className={layoutStyles.topBar}>
        <h1 className={layoutStyles.pageHeading}>Add New Product</h1>
        <Link href="/seller/dashboard" className={layoutStyles.buttonSecondary}>
          Back to Inventory
        </Link>
      </header>

      <div className={styles.content}>
        <div className={styles.formCard}>
          {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}
          {successMessage && <div className={styles.alertSuccess}>{successMessage}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* 1. Basic Information & Title / Description */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>1. Product Information</h2>
                <button
                  type="button"
                  onClick={handleAutoCategorize}
                  disabled={aiLoading || !title.trim()}
                  className={styles.aiButton}
                  title="Generate taxonomy category and tags using Gemini AI"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  {aiLoading ? 'Auto-Categorizing...' : 'Auto-Categorize with AI ✨'}
                </button>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="title">
                  Product Title *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  className={styles.input}
                  placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="description">
                  Description *
                </label>
                <textarea
                  id="description"
                  required
                  className={styles.textarea}
                  placeholder="Provide product specifications, key features, and condition..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Radix UI Separator Primitive */}
            <Separator.Root className={styles.separator} orientation="horizontal" />

            {/* 2. Taxonomy & AI Classification */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>2. Marketplace Taxonomy & Tags</h2>
                {isAiCategorized && aiConfidence !== null && (
                  <span className={styles.aiBadge}>
                    <span>✨</span>
                    <span>AI Validated ({(aiConfidence * 100).toFixed(0)}% confidence)</span>
                  </span>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="category">
                    Category *
                  </label>
                  <input
                    id="category"
                    type="text"
                    required
                    className={styles.input}
                    placeholder="e.g. Electronics"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="subCategory">
                    Sub-Category (Optional)
                  </label>
                  <input
                    id="subCategory"
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Headphones & Audio"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="tags">
                  Tags (Comma-separated, max 5)
                </label>
                <input
                  id="tags"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. wireless, bluetooth, noise-cancelling"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />

                {tagsInput && (
                  <div className={styles.tagsContainer}>
                    {tagsInput
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag, idx) => (
                        <span key={idx} className={styles.tagChip}>
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Radix UI Separator Primitive */}
            <Separator.Root className={styles.separator} orientation="horizontal" />

            {/* 3. Pricing & Image URL */}
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>3. Pricing & Media</h2>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="price">
                    Price ($ USD) *
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className={styles.input}
                    placeholder="29.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="imageUrl">
                    Image URL
                  </label>
                  <input
                    id="imageUrl"
                    type="url"
                    className={styles.input}
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {imageUrl && (
                <div className={styles.imagePreviewContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className={styles.imagePreview}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Asset Preview</span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className={styles.buttonPrimary}>
              {loading ? 'Publishing Product...' : 'Publish Product to Inventory'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
