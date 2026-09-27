'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR } from '@/lib/formatters';
import type { Json } from '@/types/database.types';
import { Save, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

type AttributeItem = { id: string; key: string; value: string };

function attributesToList(value: Json): AttributeItem[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [{ id: '1', key: '', value: '' }];
  }
  const entries = Object.entries(value).map(([key, entry], index) => ({
    id: String(index + 1),
    key,
    value: entry == null ? '' : String(entry),
  }));
  return entries.length ? entries : [{ id: '1', key: '', value: '' }];
}

function listToAttributes(list: AttributeItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of list) {
    if (item.key.trim()) out[item.key.trim()] = item.value.trim();
  }
  return out;
}

export default function ProductEditor({
  product,
}: {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
    condition: string;
    category: string;
    sub_category: string | null;
    tags: string[];
    attributes: Json;
    image_urls: string[];
    approval_status: string;
    resubmit_count: number;
    rejection_reason: string | null;
    ai_categorized: boolean;
    average_rating: number;
    review_count: number;
    created_at: string;
    updated_at: string;
  };
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);
  const [condition, setCondition] = useState(product.condition);
  const [category, setCategory] = useState(product.category);
  const [subCategory, setSubCategory] = useState(product.sub_category ?? '');
  const [tagsInput, setTagsInput] = useState((product.tags ?? []).join(', '));
  const [imageUrl, setImageUrl] = useState((product.image_urls ?? [])[0] ?? '');
  const [attributesList, setAttributesList] = useState<AttributeItem[]>(() => attributesToList(product.attributes));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = product.approval_status === 'approved';
  const canResubmit = product.approval_status === 'rejected' && product.resubmit_count < 3;

  const save = async (resubmit: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      const response = await fetchWithCsrf(`/api/v1/seller/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price,
          stock,
          condition,
          category,
          subCategory,
          tags,
          attributes: listToAttributes(attributesList),
          imageUrls: imageUrl.trim() ? [imageUrl.trim()] : [],
          resubmit,
        }),
      });
      const payload: unknown = await response.json();
      setMessage(response.ok
        ? (resubmit ? 'Sent for approval again.' : 'Product changes saved successfully.')
        : (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not save product.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Moderation Status Banner */}
      <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            className={`portal-badge ${product.approval_status === 'approved' ? 'active' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}
          >
            {product.approval_status}
          </span>
          <span style={{ fontSize: '0.825rem', color: 'var(--fg-muted)' }}>
            Resubmits used: <strong>{product.resubmit_count}</strong> of 3
          </span>
          {product.ai_categorized && (
            <span className="section-badge" style={{ fontSize: '0.65rem' }}>AI Assisted</span>
          )}
        </div>

        {product.rejection_reason && (
          <div style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem 0.85rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.8rem' }}>
            <strong>Rejection Reason:</strong> {product.rejection_reason}
          </div>
        )}
      </div>

      {locked && (
        <div style={{ padding: '0.85rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
          ✓ This product listing is Approved & Live in the marketplace catalog. Fields are view-only.
        </div>
      )}

      <form
        onSubmit={(event) => { event.preventDefault(); void save(false); }}
        className="checkout-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Product Information</h2>

        <div className="auth-form-group" style={{ marginBottom: 0 }}>
          <label className="auth-label">Product Title</label>
          <input
            type="text"
            className="auth-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={locked}
            required
          />
        </div>

        <div className="auth-form-group" style={{ marginBottom: 0 }}>
          <label className="auth-label">Description</label>
          <textarea
            rows={4}
            className="auth-input"
            style={{ height: 'auto', padding: '0.75rem 1rem' }}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={locked}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="auth-form-group" style={{ marginBottom: 0 }}>
            <label className="auth-label">Unit Price (₹ INR)</label>
            <input
              type="number"
              step="0.01"
              className="auth-input"
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
              disabled={locked}
              required
            />
          </div>

          <div className="auth-form-group" style={{ marginBottom: 0 }}>
            <label className="auth-label">Stock Quantity</label>
            <input
              type="number"
              className="auth-input"
              value={stock}
              onChange={(event) => setStock(Number(event.target.value))}
              disabled={locked}
              required
            />
          </div>

          <div className="auth-form-group" style={{ marginBottom: 0 }}>
            <label className="auth-label">Condition</label>
            <select
              className="custom-select"
              style={{ width: '100%', height: '3.1rem' }}
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              disabled={locked}
            >
              <option value="New">New</option>
              <option value="Renewed">Renewed</option>
              <option value="Used">Used</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="auth-form-group" style={{ marginBottom: 0 }}>
            <label className="auth-label">Category</label>
            <input
              type="text"
              className="auth-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={locked}
              required
            />
          </div>

          <div className="auth-form-group" style={{ marginBottom: 0 }}>
            <label className="auth-label">Sub-Category</label>
            <input
              type="text"
              className="auth-input"
              value={subCategory}
              onChange={(event) => setSubCategory(event.target.value)}
              disabled={locked}
            />
          </div>
        </div>

        <div className="auth-form-group" style={{ marginBottom: 0 }}>
          <label className="auth-label">Tags (comma separated)</label>
          <input
            type="text"
            className="auth-input"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            disabled={locked}
            placeholder="electronics, apple, ipad"
          />
        </div>

        <div className="auth-form-group" style={{ marginBottom: 0 }}>
          <label className="auth-label">Image URL</label>
          <input
            type="url"
            className="auth-input"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            disabled={locked}
          />
          {imageUrl && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={title} style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Image Preview</span>
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

        {/* Specifications Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Technical Specifications</h3>
            {!locked && (
              <button
                type="button"
                className="btn-card-toggle"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setAttributesList((prev) => [...prev, { id: String(Date.now()), key: '', value: '' }])}
              >
                + Add Spec
              </button>
            )}
          </div>

          <div className="spec-input-grid">
            {attributesList.map((item) => (
              <div key={item.id} className="spec-input-row">
                <input
                  type="text"
                  className="auth-input"
                  value={item.key}
                  placeholder="Key (e.g. Battery)"
                  disabled={locked}
                  onChange={(event) => setAttributesList((prev) => prev.map((row) => row.id === item.id ? { ...row, key: event.target.value } : row))}
                />
                <input
                  type="text"
                  className="auth-input"
                  value={item.value}
                  placeholder="Value (e.g. 5000 mAh)"
                  disabled={locked}
                  onChange={(event) => setAttributesList((prev) => prev.map((row) => row.id === item.id ? { ...row, value: event.target.value } : row))}
                />
                {!locked && (
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ color: 'var(--danger)', padding: '0.65rem 0.85rem' }}
                    onClick={() => setAttributesList((prev) => prev.filter((row) => row.id !== item.id))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div style={{ padding: '0.85rem 1rem', background: message.includes('successfully') || message.includes('saved') ? 'var(--success-bg)' : 'var(--danger-bg)', color: message.includes('successfully') || message.includes('saved') ? 'var(--success)' : 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          {(product.approval_status === 'pending' || product.approval_status === 'rejected') && !locked && (
            <button
              type="submit"
              className="btn-card-add"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={saving}
            >
              <Save size={15} />
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          )}

          {canResubmit && (
            <button
              type="button"
              className="btn-card-toggle"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={saving}
              onClick={() => { void save(true); }}
            >
              <Send size={14} />
              <span>Resubmit for Approval</span>
            </button>
          )}
        </div>

        {product.approval_status === 'rejected' && !canResubmit && (
          <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 500 }}>
            This listing has reached the limit of 3 resubmission attempts. Please contact admin support.
          </p>
        )}
      </form>
    </div>
  );
}
