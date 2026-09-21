'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../seller.module.css';

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Fetch authenticated user session to guarantee authentic seller_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();

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

      // 2. Insert into Supabase products table with authenticated seller_id
      const { data: insertedProduct, error: insertError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id, // CRITICAL: Populated with current logged-in user's auth.uid()
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          category: category.trim() || 'General',
          image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
          is_published: true,
          stock: 10,
          tags: [],
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
      setLoading(false);

      // Redirect after a brief moment to inventory dashboard
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
      <header className={styles.topBar}>
        <h1 className={styles.pageHeading}>Add New Product</h1>
        <Link href="/seller/dashboard" className={styles.buttonSecondary}>
          Back to Inventory
        </Link>
      </header>

      <div className={styles.content}>
        <div className={styles.formCard}>
          {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}
          {successMessage && <div className={styles.alertSuccess}>{successMessage}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="title">
                Product Title *
              </label>
              <input
                id="title"
                type="text"
                required
                className={styles.input}
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
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
                placeholder="Provide detailed product specifications, features, and condition..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

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
              <label className={styles.label} htmlFor="category">
                Category
              </label>
              <select
                id="category"
                className={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Electronics">Electronics</option>
                <option value="Apparel & Accessories">Apparel & Accessories</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Health & Beauty">Health & Beauty</option>
                <option value="Books & Media">Books & Media</option>
              </select>
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
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Image preview</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.buttonPrimary}
            >
              {loading ? 'Adding Product...' : 'Publish Product to Inventory'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
