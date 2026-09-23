'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Separator from '@radix-ui/react-separator';
import { createClient } from '@/lib/supabase/client';
import type { CategoryResponse } from '@/lib/validations/ai';
import { fetchWithCsrf } from '@/lib/csrf-client';
import * as styles from '../seller.css';
import layoutStyles from '../seller.module.css';

interface AttributeItem {
  id: string;
  key: string;
  value: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createClient();

  // Multi-step Wizard Navigation: 1 = Path Selection, 2 = AI Mini-Form, 3 = Verification & Rich Form
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [entryMode, setEntryMode] = useState<'ai' | 'manual' | null>(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [briefDescription, setBriefDescription] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<'New' | 'Renewed' | 'Used'>('New');
  const [stock, setStock] = useState('10');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Taxonomy & Tags
  const [category, setCategory] = useState('General');
  const [subCategory, setSubCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [isAiCategorized, setIsAiCategorized] = useState(false);

  // Dynamic Technical Specifications (Amazon-level 10+ Specs)
  const [attributesList, setAttributesList] = useState<AttributeItem[]>([
    { id: '1', key: 'Brand', value: '' },
    { id: '2', key: 'Material', value: '' },
    { id: '3', key: 'Dimensions', value: '' },
    { id: '4', key: 'Weight', value: '' },
  ]);

  // Consent & Compliance
  const [verifiedConsent, setVerifiedConsent] = useState(false);

  // Loading & Error States
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Actions ---

  // Path 1: Choose AI Assisted
  const handleSelectAIPath = () => {
    setEntryMode('ai');
    setStep(2);
    setErrorMessage(null);
  };

  // Path 2: Choose Manual Entry
  const handleSelectManualPath = () => {
    setEntryMode('manual');
    setIsAiCategorized(false);
    setStep(3);
    setErrorMessage(null);
  };

  // Step 2: Trigger AI Generation
  const handleRunAICategorizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a product title to proceed.');
      return;
    }

    setAiLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetchWithCsrf('/api/v1/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: briefDescription.trim(),
          condition,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'AI catalog generation failed.');
      }

      const aiResult = data as CategoryResponse;

      // Populate Rich Form in Step 3
      setDescription(briefDescription.trim() || `${title.trim()} (${condition} condition).`);
      setCategory(aiResult.category);
      setSubCategory(aiResult.sub_category);
      setTagsInput(aiResult.tags.join(', '));
      setPrice(aiResult.suggested_price ? aiResult.suggested_price.toFixed(2) : '29.99');
      setAiConfidence(aiResult.confidence);
      setIsAiCategorized(true);

      // Populate dynamic attributes from AI
      if (aiResult.attributes && typeof aiResult.attributes === 'object') {
        const generatedAttrs: AttributeItem[] = Object.entries(aiResult.attributes).map(
          ([key, value], idx) => ({
            id: String(idx + 1),
            key,
            value: String(value),
          })
        );
        setAttributesList(generatedAttrs);
      }

      // Move to Step 3 (Verification)
      setStep(3);
      setSuccessMessage(
        `AI Master Agent generated ${
          Object.keys(aiResult.attributes || {}).length
        } technical specifications with ${(aiResult.confidence * 100).toFixed(0)}% confidence!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI categorization failed. Proceeding with manual input.';
      setErrorMessage(msg);
      // Allow graceful fallback to manual entry
      setStep(3);
    } finally {
      setAiLoading(false);
    }
  };

  // Manage Dynamic Attributes in Step 3
  const handleUpdateAttribute = (id: string, field: 'key' | 'value', text: string) => {
    setAttributesList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: text } : item))
    );
  };

  const handleAddAttribute = () => {
    const newId = String(Date.now());
    setAttributesList((prev) => [...prev, { id: newId, key: '', value: '' }]);
  };

  const handleRemoveAttribute = (id: string) => {
    setAttributesList((prev) => prev.filter((item) => item.id !== id));
  };

  // Step 3: Final Submission with approval_status: 'pending'
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!verifiedConsent) {
      setErrorMessage('Please check the verification consent checkbox before submitting.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch authenticated user session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage('Authentication session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setErrorMessage('Please enter a valid non-negative product price.');
        setLoading(false);
        return;
      }

      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        setErrorMessage('Please enter a valid non-negative stock quantity.');
        setLoading(false);
        return;
      }

      // Convert attributesList array into JSONB object
      const attributesObject: Record<string, string> = {};
      attributesList.forEach((attr) => {
        if (attr.key.trim()) {
          attributesObject[attr.key.trim()] = attr.value.trim();
        }
      });

      // Parse tags
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // 2. Insert into Supabase products table with approval_status = 'pending'
      const { data: insertedProduct, error: insertError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          condition,
          category: category.trim() || 'General',
          sub_category: subCategory.trim() || null,
          tags: parsedTags,
          attributes: attributesObject,
          stock: parsedStock,
          approval_status: 'pending', // CRITICAL: Awaits Admin Approval
          ai_categorized: isAiCategorized,
          image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
        })
        .select()
        .single();

      if (insertError) {
        setErrorMessage(insertError.message);
        setLoading(false);
        return;
      }

      setSuccessMessage(
        `🎉 Product "${insertedProduct.title}" submitted successfully! Current status: PENDING APPROVAL. An administrator will review your listing before it goes live to customers.`
      );

      // Redirect to seller dashboard after short delay
      setTimeout(() => {
        router.push('/seller/dashboard');
        router.refresh();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while saving product.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <header className={layoutStyles.topBar}>
        <h1 className={layoutStyles.pageHeading}>Enterprise Product Onboarding</h1>
        <Link href="/seller/dashboard" className={layoutStyles.buttonSecondary}>
          Back to Inventory
        </Link>
      </header>

      <div className={styles.content}>
        {/* Wizard Progress Bar */}
        <div className={styles.wizardProgressContainer}>
          <div className={styles.wizardStep}>
            <div
              className={`${styles.wizardStepCircle} ${
                step === 1 ? styles.wizardStepCircleActive : styles.wizardStepCircleCompleted
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={styles.wizardStepText}>
              <span className={styles.wizardStepTitle}>Step 1</span>
              <span className={styles.wizardStepSubtitle}>Onboarding Mode</span>
            </div>
          </div>

          <div className={styles.wizardDivider} />

          <div className={styles.wizardStep}>
            <div
              className={`${styles.wizardStepCircle} ${
                step === 2
                  ? styles.wizardStepCircleActive
                  : step > 2
                  ? styles.wizardStepCircleCompleted
                  : ''
              }`}
            >
              {step > 2 ? '✓' : '2'}
            </div>
            <div className={styles.wizardStepText}>
              <span className={styles.wizardStepTitle}>Step 2</span>
              <span className={styles.wizardStepSubtitle}>
                {entryMode === 'ai' ? 'AI Extraction' : 'Catalog Setup'}
              </span>
            </div>
          </div>

          <div className={styles.wizardDivider} />

          <div className={styles.wizardStep}>
            <div
              className={`${styles.wizardStepCircle} ${
                step === 3 ? styles.wizardStepCircleActive : ''
              }`}
            >
              3
            </div>
            <div className={styles.wizardStepText}>
              <span className={styles.wizardStepTitle}>Step 3</span>
              <span className={styles.wizardStepSubtitle}>Verification & Review</span>
            </div>
          </div>
        </div>

        {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}
        {successMessage && <div className={styles.alertSuccess}>{successMessage}</div>}

        {/* ========================================================================= */}
        {/* STEP 1: PATH SELECTION (Manual vs AI-Assisted) */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                How would you like to onboard this product?
              </h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
                Choose between automated Amazon-grade AI catalog generation or standard manual entry.
              </p>
            </div>

            <div className={styles.pathSelectionGrid}>
              {/* Option A: AI Assisted (Fast) */}
              <div className={styles.pathCard} onClick={handleSelectAIPath}>
                <div>
                  <span className={`${styles.pathBadge} ${styles.pathBadgeAI}`}>
                    ✨ Recommended • Enterprise Speed
                  </span>
                  <h3 className={styles.pathCardTitle}>
                    <span>AI-Assisted (Fast)</span>
                  </h3>
                  <p className={styles.pathCardDesc}>
                    Provide a brief product name. Our Master E-commerce Data Entry Agent automatically
                    generates categories, sub-categories, 10+ technical specifications, and search tags.
                  </p>
                  <ul className={styles.pathFeaturesList}>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#7c3aed' }}>✓</span> 10+ Technical Specifications Generated
                    </li>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#7c3aed' }}>✓</span> Automatic Marketplace Taxonomy
                    </li>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#7c3aed' }}>✓</span> Suggested Competitive Retail Price
                    </li>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#7c3aed' }}>✓</span> 100% Seller Verification & Edit Control
                    </li>
                  </ul>
                </div>
                <button type="button" className={`${styles.pathButton} ${styles.pathButtonAI}`}>
                  Launch AI-Assisted Mode ⚡
                </button>
              </div>

              {/* Option B: Manual Entry */}
              <div
                className={`${styles.pathCard} ${styles.pathCardManual}`}
                onClick={handleSelectManualPath}
              >
                <div>
                  <span className={`${styles.pathBadge} ${styles.pathBadgeManual}`}>
                    Standard Entry
                  </span>
                  <h3 className={styles.pathCardTitle}>
                    <span>Manual Entry</span>
                  </h3>
                  <p className={styles.pathCardDesc}>
                    Prefer to craft your product details by hand? Fill out every product attribute,
                    taxonomic category, and custom specification manually from scratch.
                  </p>
                  <ul className={styles.pathFeaturesList}>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#0f172a' }}>✓</span> Complete Granular Control
                    </li>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#0f172a' }}>✓</span> Add Custom Specifications Manually
                    </li>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#0f172a' }}>✓</span> Set Own Pricing & Tags
                    </li>
                    <li className={styles.pathFeatureItem}>
                      <span style={{ color: '#0f172a' }}>✓</span> Standard Admin Approval Workflow
                    </li>
                  </ul>
                </div>
                <button type="button" className={`${styles.pathButton} ${styles.pathButtonManual}`}>
                  Continue with Manual Entry ✍️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: AI MINI-FORM & SKELETON LOADING */}
        {/* ========================================================================= */}
        {step === 2 && entryMode === 'ai' && (
          <div className={styles.formCard}>
            {aiLoading ? (
              <div className={styles.skeletonCard}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖✨</div>
                <div className={styles.skeletonPulseText}>
                  Master E-commerce Agent is Analyzing Product...
                </div>
                <p className={styles.skeletonSubtext}>
                  Deducing marketplace taxonomy, generating 10+ technical specifications, and calculating pricing.
                </p>

                <div className={styles.skeletonGrid}>
                  <div className={styles.skeletonBar} style={{ width: '85%' }} />
                  <div className={styles.skeletonBar} style={{ width: '95%' }} />
                  <div className={styles.skeletonBar} style={{ width: '70%' }} />
                  <div className={styles.skeletonBar} style={{ width: '90%' }} />
                  <div className={styles.skeletonBar} style={{ width: '60%' }} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleRunAICategorizer} className={styles.form}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>AI Fast-Track Input</h2>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      Give us the basics. The AI Agent will handle the heavy catalog enrichment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={styles.buttonSecondary}
                  >
                    ← Change Mode
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ai_title">
                    Product Name / Brand & Model *
                  </label>
                  <input
                    id="ai_title"
                    type="text"
                    required
                    className={styles.input}
                    placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ai_briefDesc">
                    Brief Product Summary / Keywords (Optional)
                  </label>
                  <textarea
                    id="ai_briefDesc"
                    className={styles.textarea}
                    placeholder="e.g. Over-ear active noise cancelling bluetooth headphones with 30-hour battery life..."
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="ai_condition">
                      Product Condition *
                    </label>
                    <select
                      id="ai_condition"
                      className={styles.select}
                      value={condition}
                      onChange={(e) =>
                        setCondition(e.target.value as 'New' | 'Renewed' | 'Used')
                      }
                    >
                      <option value="New">New (Factory Sealed)</option>
                      <option value="Renewed">Renewed (Certified Refurbished)</option>
                      <option value="Used">Used (Pre-Owned / Inspected)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="ai_stock">
                      Initial Inventory Stock Quantity *
                    </label>
                    <input
                      id="ai_stock"
                      type="number"
                      min="0"
                      required
                      className={styles.input}
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={aiLoading || !title.trim()}
                  className={styles.buttonPrimary}
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  Generate Enterprise Specifications ✨
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: VERIFICATION & RICH FORM (Massive Editable Form) */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className={styles.formCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {entryMode === 'ai'
                    ? 'Verify & Refine AI-Enriched Listing'
                    : 'Product Specification Form'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Review all specifications. You maintain complete control to edit any field before
                  submitting for administrator approval.
                </p>
              </div>

              {isAiCategorized && aiConfidence !== null && (
                <span className={styles.aiBadge}>
                  <span>✨</span>
                  <span>AI Validated ({(aiConfidence * 100).toFixed(0)}% confidence)</span>
                </span>
              )}
            </div>

            <Separator.Root className={styles.separator} orientation="horizontal" />

            <form onSubmit={handleSubmitProduct} className={styles.form}>
              {/* Section 1: Core Catalog Information */}
              <div className={styles.formSection}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  1. Core Catalog Details
                </h3>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="final_title">
                    Product Title *
                  </label>
                  <input
                    id="final_title"
                    type="text"
                    required
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="final_description">
                    Full Description *
                  </label>
                  <textarea
                    id="final_description"
                    required
                    className={styles.textarea}
                    style={{ minHeight: '120px' }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="final_category">
                      Marketplace Category *
                    </label>
                    <input
                      id="final_category"
                      type="text"
                      required
                      className={styles.input}
                      placeholder="e.g. Electronics"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="final_subcategory">
                      Sub-Category
                    </label>
                    <input
                      id="final_subcategory"
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Headphones & Portable Audio"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="final_price">
                      Unit Price (₹ INR) *
                    </label>
                    <input
                      id="final_price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className={styles.input}
                      placeholder="1499.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="final_stock">
                      Stock Quantity *
                    </label>
                    <input
                      id="final_stock"
                      type="number"
                      min="0"
                      required
                      className={styles.input}
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="final_condition">
                      Condition *
                    </label>
                    <select
                      id="final_condition"
                      className={styles.select}
                      value={condition}
                      onChange={(e) =>
                        setCondition(e.target.value as 'New' | 'Renewed' | 'Used')
                      }
                    >
                      <option value="New">New</option>
                      <option value="Renewed">Renewed</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="final_image">
                    Product Image URL
                  </label>
                  <input
                    id="final_image"
                    type="url"
                    className={styles.input}
                    placeholder="https://images.unsplash.com/photo-..."
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
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Image Asset Verified
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="final_tags">
                    Search & Indexing Tags (Comma separated)
                  </label>
                  <input
                    id="final_tags"
                    type="text"
                    className={styles.input}
                    placeholder="e.g. wireless, noise cancelling, bluetooth"
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

              <Separator.Root className={styles.separator} orientation="horizontal" />

              {/* Section 2: Dynamic Technical Attributes (Amazon/Flipkart Spec Grid) */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      2. Dynamic Technical Specifications ({attributesList.length} Attributes)
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                      Enterprise specifications displayed on product detail pages. Edit keys or values
                      freely.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className={styles.addAttrBtn}
                  >
                    + Add Specification
                  </button>
                </div>

                <div className={styles.attributesContainer}>
                  {attributesList.map((attr) => (
                    <div key={attr.id} className={styles.attributeRow}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Specification Name (e.g. Material)"
                        value={attr.key}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, 'key', e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Specification Value (e.g. Aluminum & Leather)"
                        value={attr.value}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, 'value', e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttribute(attr.id)}
                        className={styles.removeAttrBtn}
                        title="Remove attribute"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator.Root className={styles.separator} orientation="horizontal" />

              {/* Section 3: Compliance & Verification Consent Checkbox */}
              <div className={styles.consentCard}>
                <label className={styles.consentLabel}>
                  <input
                    type="checkbox"
                    required
                    checked={verifiedConsent}
                    onChange={(e) => setVerifiedConsent(e.target.checked)}
                    className={styles.consentCheckbox}
                  />
                  <span>
                    I manually verify these details are accurate and comply with marketplace catalog policies.
                  </span>
                </label>
                <p className={styles.consentWarning}>
                  🔒 <strong>Admin Review Protocol:</strong> All listings are initially registered under{' '}
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>PENDING</span> status.
                  An administrator will review and approve your submission before it is published to
                  customers.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={loading || !verifiedConsent}
                  className={styles.buttonPrimary}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Submitting for Review...' : 'Submit for Admin Approval (Pending Review)'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={styles.buttonSecondary}
                  disabled={loading}
                >
                  Reset Wizard
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
