'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Separator from '@radix-ui/react-separator';
import { createClient } from '@/lib/supabase/client';
import type { CategoryResponse } from '@/lib/validations/ai';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface AttributeItem {
  id: string;
  key: string;
  value: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const preset = searchParams.get('category');
    if (preset) setCategory(preset);
  }, [searchParams]);
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

      const { data: shop } = await supabase.from('shops').select('id').eq('seller_id', user.id).maybeSingle();

      // 2. Insert into Supabase products table with approval_status = 'pending'
      const { data: insertedProduct, error: insertError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          shop_id: shop?.id ?? null,
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
      <header>
        <h1>Enterprise Product Onboarding</h1>
        <Link href="/seller/dashboard">
          Back to Inventory
        </Link>
      </header>

      <div>
        {/* Wizard Progress Bar */}
        <div>
          <div>
            <div
            >
              {step > 1 ? '✓' : '1'}
            </div>
            <div>
              <span>Step 1</span>
              <span>Onboarding Mode</span>
            </div>
          </div>

          <div />

          <div>
            <div
            >
              {step > 2 ? '✓' : '2'}
            </div>
            <div>
              <span>Step 2</span>
              <span>
                {entryMode === 'ai' ? 'AI Extraction' : 'Catalog Setup'}
              </span>
            </div>
          </div>

          <div />

          <div>
            <div
            >
              3
            </div>
            <div>
              <span>Step 3</span>
              <span>Verification & Review</span>
            </div>
          </div>
        </div>

        {errorMessage && <div>{errorMessage}</div>}
        {successMessage && <div>{successMessage}</div>}

        {/* ========================================================================= */}
        {/* STEP 1: PATH SELECTION (Manual vs AI-Assisted) */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div>
            <div>
              <h2>
                How would you like to onboard this product?
              </h2>
              <p>
                Choose between automated Amazon-grade AI catalog generation or standard manual entry.
              </p>
            </div>

            <div>
              {/* Option A: AI Assisted (Fast) */}
              <div onClick={handleSelectAIPath}>
                <div>
                  <span>
                    ✨ Recommended • Enterprise Speed
                  </span>
                  <h3>
                    <span>AI-Assisted (Fast)</span>
                  </h3>
                  <p>
                    Provide a brief product name. Our Master E-commerce Data Entry Agent automatically
                    generates categories, sub-categories, 10+ technical specifications, and search tags.
                  </p>
                  <ul>
                    <li>
                      <span>✓</span> 10+ Technical Specifications Generated
                    </li>
                    <li>
                      <span>✓</span> Automatic Marketplace Taxonomy
                    </li>
                    <li>
                      <span>✓</span> Suggested Competitive Retail Price
                    </li>
                    <li>
                      <span>✓</span> 100% Seller Verification & Edit Control
                    </li>
                  </ul>
                </div>
                <button type="button">
                  Launch AI-Assisted Mode ⚡
                </button>
              </div>

              {/* Option B: Manual Entry */}
              <div
                onClick={handleSelectManualPath}
              >
                <div>
                  <span>
                    Standard Entry
                  </span>
                  <h3>
                    <span>Manual Entry</span>
                  </h3>
                  <p>
                    Prefer to craft your product details by hand? Fill out every product attribute,
                    taxonomic category, and custom specification manually from scratch.
                  </p>
                  <ul>
                    <li>
                      <span>✓</span> Complete Granular Control
                    </li>
                    <li>
                      <span>✓</span> Add Custom Specifications Manually
                    </li>
                    <li>
                      <span>✓</span> Set Own Pricing & Tags
                    </li>
                    <li>
                      <span>✓</span> Standard Admin Approval Workflow
                    </li>
                  </ul>
                </div>
                <button type="button">
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
          <div>
            {aiLoading ? (
              <div>
                <div>🤖✨</div>
                <div>
                  Master E-commerce Agent is Analyzing Product...
                </div>
                <p>
                  Deducing marketplace taxonomy, generating 10+ technical specifications, and calculating pricing.
                </p>

                <div>
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            ) : (
              <form onSubmit={handleRunAICategorizer}>
                <div>
                  <div>
                    <h2>AI Fast-Track Input</h2>
                    <p>
                      Give us the basics. The AI Agent will handle the heavy catalog enrichment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    ← Change Mode
                  </button>
                </div>

                <div>
                  <label htmlFor="ai_title">
                    Product Name / Brand & Model *
                  </label>
                  <input
                    id="ai_title"
                    type="text"
                    required
                    placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="ai_briefDesc">
                    Brief Product Summary / Keywords (Optional)
                  </label>
                  <textarea
                    id="ai_briefDesc"
                    placeholder="e.g. Over-ear active noise cancelling bluetooth headphones with 30-hour battery life..."
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                  />
                </div>

                <div>
                  <div>
                    <label htmlFor="ai_condition">
                      Product Condition *
                    </label>
                    <select
                      id="ai_condition"
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

                  <div>
                    <label htmlFor="ai_stock">
                      Initial Inventory Stock Quantity *
                    </label>
                    <input
                      id="ai_stock"
                      type="number"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={aiLoading || !title.trim()}
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
          <div>
            <div>
              <div>
                <h2>
                  {entryMode === 'ai'
                    ? 'Verify & Refine AI-Enriched Listing'
                    : 'Product Specification Form'}
                </h2>
                <p>
                  Review all specifications. You maintain complete control to edit any field before
                  submitting for administrator approval.
                </p>
              </div>

              {isAiCategorized && aiConfidence !== null && (
                <span>
                  <span>✨</span>
                  <span>AI Validated ({(aiConfidence * 100).toFixed(0)}% confidence)</span>
                </span>
              )}
            </div>

            <Separator.Root orientation="horizontal" />

            <form onSubmit={handleSubmitProduct}>
              {/* Section 1: Core Catalog Information */}
              <div>
                <h3>
                  1. Core Catalog Details
                </h3>

                <div>
                  <label htmlFor="final_title">
                    Product Title *
                  </label>
                  <input
                    id="final_title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="final_description">
                    Full Description *
                  </label>
                  <textarea
                    id="final_description"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <div>
                    <label htmlFor="final_category">
                      Marketplace Category *
                    </label>
                    <input
                      id="final_category"
                      type="text"
                      required
                      placeholder="e.g. Electronics"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="final_subcategory">
                      Sub-Category
                    </label>
                    <input
                      id="final_subcategory"
                      type="text"
                      placeholder="e.g. Headphones & Portable Audio"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div>
                    <label htmlFor="final_price">
                      Unit Price (₹ INR) *
                    </label>
                    <input
                      id="final_price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="1499.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="final_stock">
                      Stock Quantity *
                    </label>
                    <input
                      id="final_stock"
                      type="number"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="final_condition">
                      Condition *
                    </label>
                    <select
                      id="final_condition"
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

                <div>
                  <label htmlFor="final_image">
                    Product Image URL
                  </label>
                  <input
                    id="final_image"
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  {imageUrl && (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Preview"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span>
                        Image Asset Verified
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="final_tags">
                    Search & Indexing Tags (Comma separated)
                  </label>
                  <input
                    id="final_tags"
                    type="text"
                    placeholder="e.g. wireless, noise cancelling, bluetooth"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                  {tagsInput && (
                    <div>
                      {tagsInput
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag, idx) => (
                          <span key={idx}>
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator.Root orientation="horizontal" />

              {/* Section 2: Dynamic Technical Attributes (Amazon/Flipkart Spec Grid) */}
              <div>
                <div>
                  <div>
                    <h3>
                      2. Dynamic Technical Specifications ({attributesList.length} Attributes)
                    </h3>
                    <p>
                      Enterprise specifications displayed on product detail pages. Edit keys or values
                      freely.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                  >
                    + Add Specification
                  </button>
                </div>

                <div>
                  {attributesList.map((attr) => (
                    <div key={attr.id}>
                      <input
                        type="text"
                        placeholder="Specification Name (e.g. Material)"
                        value={attr.key}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, 'key', e.target.value)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Specification Value (e.g. Aluminum & Leather)"
                        value={attr.value}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, 'value', e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttribute(attr.id)}
                        title="Remove attribute"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator.Root orientation="horizontal" />

              {/* Section 3: Compliance & Verification Consent Checkbox */}
              <div>
                <label>
                  <input
                    type="checkbox"
                    required
                    checked={verifiedConsent}
                    onChange={(e) => setVerifiedConsent(e.target.checked)}
                  />
                  <span>
                    I manually verify these details are accurate and comply with marketplace catalog policies.
                  </span>
                </label>
                <p>
                  🔒 <strong>Admin Review Protocol:</strong> All listings are initially registered under{' '}
                  <span>PENDING</span> status.
                  An administrator will review and approve your submission before it is published to
                  customers.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !verifiedConsent}
                >
                  {loading ? 'Submitting for Review...' : 'Submit for Admin Approval (Pending Review)'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
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
