'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Plus, Trash2, CheckCircle2, Zap, PenTool } from 'lucide-react';
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
    <div className="animate-slide-up" style={{ paddingBottom: '4rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Enterprise Product Onboarding</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Publish catalog items to ShopSphere India with automatic specs or granular control.
          </p>
        </div>
        <Link href="/seller/dashboard" className="btn-card-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      <div>
        {/* Wizard Progress Bar */}
        <div className="wizard-progress-bar">
          <div className={`wizard-step-node ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
            <div className="wizard-step-circle">
              {step > 1 ? '✓' : '1'}
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Step 1</span>
              <strong style={{ fontSize: '0.85rem' }}>Onboarding Mode</strong>
            </div>
          </div>

          <div className="wizard-step-line" />

          <div className={`wizard-step-node ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <div className="wizard-step-circle">
              {step > 2 ? '✓' : '2'}
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Step 2</span>
              <strong style={{ fontSize: '0.85rem' }}>
                {entryMode === 'ai' ? 'AI Extraction' : 'Catalog Setup'}
              </strong>
            </div>
          </div>

          <div className="wizard-step-line" />

          <div className={`wizard-step-node ${step === 3 ? 'active' : ''}`}>
            <div className="wizard-step-circle">
              3
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Step 3</span>
              <strong style={{ fontSize: '0.85rem' }}>Verification & Review</strong>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            ✓ {successMessage}
          </div>
        )}

        {/* STEP 1: PATH SELECTION (Manual vs AI-Assisted) */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                How would you like to onboard this product?
              </h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.925rem' }}>
                Choose between automated Amazon-grade AI catalog generation or standard manual entry.
              </p>
            </div>

            <div className="wizard-path-grid">
              {/* Option A: AI Assisted (Fast) */}
              <div className="wizard-path-card highlight" onClick={handleSelectAIPath}>
                <div>
                  <span className="section-badge" style={{ marginBottom: '1rem' }}>
                    ✨ Recommended · Fast
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--fg-primary)' }}>
                    AI-Assisted Fast-Track
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Provide just a product title. Our E-Commerce Master Agent deduces categories, generates 10+ technical specifications, tags, and suggested pricing in INR.
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem', color: 'var(--fg-secondary)', marginBottom: '1.5rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 10+ Technical Specifications Generated
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> Automatic Marketplace Taxonomy & Tags
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> Suggested Competitive Retail Price in ₹
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 100% Seller Verification & Edit Control
                    </li>
                  </ul>
                </div>
                <button type="button" className="btn-card-add" style={{ width: '100%', height: '2.85rem' }}>
                  Launch AI-Assisted Mode ⚡
                </button>
              </div>

              {/* Option B: Manual Entry */}
              <div className="wizard-path-card" onClick={handleSelectManualPath}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: 'var(--fg-muted)', display: 'inline-block', marginBottom: '1rem' }}>
                    Standard Control
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--fg-primary)' }}>
                    Granular Manual Entry
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Prefer to craft your product details by hand? Fill out every product attribute, taxonomic category, and custom specification manually from scratch.
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem', color: 'var(--fg-secondary)', marginBottom: '1.5rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--fg-subtle)' }} /> Complete Granular Control
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--fg-subtle)' }} /> Add Custom Specifications Manually
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--fg-subtle)' }} /> Set Own Pricing & Tags in ₹
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--fg-subtle)' }} /> Standard Admin Approval Workflow
                    </li>
                  </ul>
                </div>
                <button type="button" className="btn-card-toggle" style={{ width: '100%', height: '2.85rem', justifyContent: 'center' }}>
                  Continue with Manual Entry ✍️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AI MINI-FORM & SKELETON LOADING */}
        {step === 2 && entryMode === 'ai' && (
          <div className="checkout-card animate-slide-up" style={{ maxWidth: '640px', margin: '0 auto' }}>
            {aiLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }} className="pulse-badge">🤖✨</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  Master E-commerce Agent is Analyzing Product...
                </div>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
                  Deducing marketplace taxonomy, generating 10+ technical specifications, and calculating suggested pricing in ₹.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '360px', margin: '0 auto' }}>
                  <div style={{ height: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: '14px', width: '80%', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', animation: 'pulse 1.5s infinite 0.2s', margin: '0 auto' }} />
                  <div style={{ height: '14px', width: '60%', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', animation: 'pulse 1.5s infinite 0.4s', margin: '0 auto' }} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleRunAICategorizer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>AI Fast-Track Input</h2>
                    <p style={{ fontSize: '0.825rem', color: 'var(--fg-muted)' }}>
                      Give us the basics. The AI Agent will handle the heavy catalog enrichment.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => setStep(1)}
                  >
                    ← Change Mode
                  </button>
                </div>

                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="ai_title" className="auth-label">
                    Product Name / Brand & Model *
                  </label>
                  <input
                    id="ai_title"
                    type="text"
                    className="auth-input"
                    required
                    placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="ai_briefDesc" className="auth-label">
                    Brief Product Summary / Keywords (Optional)
                  </label>
                  <textarea
                    id="ai_briefDesc"
                    rows={3}
                    className="auth-input"
                    style={{ height: 'auto', padding: '0.75rem 1rem' }}
                    placeholder="e.g. Over-ear active noise cancelling bluetooth headphones with 30-hour battery life..."
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="ai_condition" className="auth-label">
                      Product Condition *
                    </label>
                    <select
                      id="ai_condition"
                      className="custom-select"
                      style={{ width: '100%', height: '3.1rem' }}
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

                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="ai_stock" className="auth-label">
                      Initial Inventory Stock Quantity *
                    </label>
                    <input
                      id="ai_stock"
                      type="number"
                      className="auth-input"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-card-add"
                  style={{ height: '3rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                  disabled={aiLoading || !title.trim()}
                >
                  <Sparkles size={16} />
                  <span>Generate Enterprise Specifications ✨</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 3: VERIFICATION & RICH FORM */}
        {step === 3 && (
          <div className="animate-slide-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="checkout-card" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    {entryMode === 'ai'
                      ? 'Verify & Refine AI-Enriched Listing'
                      : 'Product Specification Form'}
                  </h2>
                  <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Review all specifications. You maintain complete control to edit any field before submitting for approval.
                  </p>
                </div>

                {isAiCategorized && aiConfidence !== null && (
                  <span className="section-badge" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                    ✨ AI Validated ({(aiConfidence * 100).toFixed(0)}% confidence)
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmitProduct} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Section 1: Core Catalog Information */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--fg-primary)' }}>
                    1. Core Catalog Details
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    <div className="auth-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="final_title" className="auth-label">
                        Product Title *
                      </label>
                      <input
                        id="final_title"
                        type="text"
                        className="auth-input"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="auth-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="final_description" className="auth-label">
                        Full Description *
                      </label>
                      <textarea
                        id="final_description"
                        rows={4}
                        className="auth-input"
                        style={{ height: 'auto', padding: '0.75rem 1rem' }}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="auth-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="final_category" className="auth-label">
                          Marketplace Category *
                        </label>
                        <input
                          id="final_category"
                          type="text"
                          className="auth-input"
                          required
                          placeholder="e.g. Electronics"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        />
                      </div>

                      <div className="auth-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="final_subcategory" className="auth-label">
                          Sub-Category
                        </label>
                        <input
                          id="final_subcategory"
                          type="text"
                          className="auth-input"
                          placeholder="e.g. Headphones & Portable Audio"
                          value={subCategory}
                          onChange={(e) => setSubCategory(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div className="auth-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="final_price" className="auth-label">
                          Unit Price (₹ INR) *
                        </label>
                        <input
                          id="final_price"
                          type="number"
                          step="0.01"
                          min="0"
                          className="auth-input"
                          required
                          placeholder="1499.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </div>

                      <div className="auth-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="final_stock" className="auth-label">
                          Stock Quantity *
                        </label>
                        <input
                          id="final_stock"
                          type="number"
                          className="auth-input"
                          min="0"
                          required
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                        />
                      </div>

                      <div className="auth-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="final_condition" className="auth-label">
                          Condition *
                        </label>
                        <select
                          id="final_condition"
                          className="custom-select"
                          style={{ width: '100%', height: '3.1rem' }}
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

                    <div className="auth-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="final_image" className="auth-label">
                        Product Image URL
                      </label>
                      <input
                        id="final_image"
                        type="url"
                        className="auth-input"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      {imageUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt="Preview"
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                            Image Asset Preview Ready
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="auth-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="final_tags" className="auth-label">
                        Search & Indexing Tags (Comma separated)
                      </label>
                      <input
                        id="final_tags"
                        type="text"
                        className="auth-input"
                        placeholder="e.g. wireless, noise cancelling, bluetooth"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                      />
                      {tagsInput && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                          {tagsInput
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .map((tag, idx) => (
                              <span key={idx} className="offer-code-chip" style={{ fontSize: '0.72rem' }}>
                                #{tag}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

                {/* Section 2: Dynamic Technical Attributes */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        2. Dynamic Technical Specifications ({attributesList.length} Attributes)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                        Enterprise specifications displayed on product detail pages. Edit keys or values freely.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-card-toggle"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      onClick={handleAddAttribute}
                    >
                      + Add Specification
                    </button>
                  </div>

                  <div className="spec-input-grid">
                    {attributesList.map((attr) => (
                      <div key={attr.id} className="spec-input-row">
                        <input
                          type="text"
                          className="auth-input"
                          placeholder="Specification Key (e.g. Material)"
                          value={attr.key}
                          onChange={(e) =>
                            handleUpdateAttribute(attr.id, 'key', e.target.value)
                          }
                        />
                        <input
                          type="text"
                          className="auth-input"
                          placeholder="Specification Value (e.g. Aluminum & Leather)"
                          value={attr.value}
                          onChange={(e) =>
                            handleUpdateAttribute(attr.id, 'value', e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn-card-toggle"
                          style={{ padding: '0.65rem 0.85rem', color: 'var(--danger)' }}
                          onClick={() => handleRemoveAttribute(attr.id)}
                          title="Remove attribute"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

                {/* Section 3: Compliance & Verification Consent Checkbox */}
                <div style={{ padding: '1.25rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      required
                      checked={verifiedConsent}
                      onChange={(e) => setVerifiedConsent(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--fg-primary)', marginTop: '2px' }}
                    />
                    <span>
                      I manually verify these product details are accurate, authentic, and comply with marketplace catalog policies.
                    </span>
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.65rem', paddingLeft: '1.8rem' }}>
                    🔒 <strong>Admin Review Protocol:</strong> All listings are registered under <span className="portal-badge pending" style={{ padding: '0.1rem 0.45rem', fontSize: '0.68rem' }}>PENDING</span> status. An administrator reviews and approves each submission before it goes live to customers.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="submit"
                    className="btn-card-add"
                    style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                    disabled={loading || !verifiedConsent}
                  >
                    {loading ? 'Submitting for Review...' : 'Submit for Admin Approval (Pending Review)'}
                  </button>

                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Reset Wizard
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
