'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR } from '@/lib/formatters';
import type { Json } from '@/types/database.types';
import layoutStyles from '@/app/seller/seller.module.css';

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
  const locked = product.approval_status === 'approved';
  const canResubmit = product.approval_status === 'rejected' && product.resubmit_count < 3;

  const save = async (resubmit: boolean) => {
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
      ? (resubmit ? 'Sent for approval again.' : 'Product saved.')
      : (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not save.'));
  };

  return (
    <div className={layoutStyles.formStack}>
      <div className={layoutStyles.statusNote}>
        Status: {product.approval_status}. Resubmits used: {product.resubmit_count} of 3.
        {product.rejection_reason ? ` Rejection note: ${product.rejection_reason}` : ''}
      </div>
      <p className={layoutStyles.muted}>
        AI categorized: {product.ai_categorized ? 'Yes' : 'No'} · Rating {product.average_rating} ({product.review_count})
        {product.compare_at_price != null ? ` · Compare at ${formatINR(product.compare_at_price)}` : ''}
      </p>
      {locked ? <p className={layoutStyles.muted}>This listing is approved. You can view every field, not edit it.</p> : null}

      <form
        className={layoutStyles.formStack}
        onSubmit={(event) => { event.preventDefault(); void save(false); }}
      >
        <h2 className={layoutStyles.panelTitle}>Details</h2>
        <label>Title <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={locked} /></label>
        <label>Description <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={locked} /></label>
        <label>Price <input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} disabled={locked} /></label>
        <label>Stock <input type="number" value={stock} onChange={(event) => setStock(Number(event.target.value))} disabled={locked} /></label>
        <label>
          Condition
          <select value={condition} onChange={(event) => setCondition(event.target.value)} disabled={locked}>
            <option value="New">New</option>
            <option value="Renewed">Renewed</option>
            <option value="Used">Used</option>
          </select>
        </label>
        <label>Category <input value={category} onChange={(event) => setCategory(event.target.value)} disabled={locked} /></label>
        <label>Sub-category <input value={subCategory} onChange={(event) => setSubCategory(event.target.value)} disabled={locked} /></label>
        <label>Tags <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} disabled={locked} placeholder="comma separated" /></label>
        <label>Image URL <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} disabled={locked} /></label>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} style={{ maxWidth: 220, borderRadius: 0, border: '1px solid #e6e6e6' }} />
        ) : null}

        <h2 className={layoutStyles.panelTitle}>Specifications</h2>
        {attributesList.map((item) => (
          <div key={item.id} className={layoutStyles.actionRow}>
            <input
              value={item.key}
              placeholder="Name"
              disabled={locked}
              onChange={(event) => setAttributesList((prev) => prev.map((row) => row.id === item.id ? { ...row, key: event.target.value } : row))}
            />
            <input
              value={item.value}
              placeholder="Value"
              disabled={locked}
              onChange={(event) => setAttributesList((prev) => prev.map((row) => row.id === item.id ? { ...row, value: event.target.value } : row))}
            />
            {!locked ? (
              <button type="button" className={layoutStyles.buttonGhost} onClick={() => setAttributesList((prev) => prev.filter((row) => row.id !== item.id))}>
                Remove
              </button>
            ) : null}
          </div>
        ))}
        {!locked ? (
          <button
            type="button"
            className={layoutStyles.buttonGhost}
            onClick={() => setAttributesList((prev) => [...prev, { id: String(Date.now()), key: '', value: '' }])}
          >
            Add specification
          </button>
        ) : null}

        <div className={layoutStyles.actionRow}>
          {(product.approval_status === 'pending' || product.approval_status === 'rejected') && !locked ? (
            <button type="submit" className={layoutStyles.buttonPrimary}>Save</button>
          ) : null}
          {canResubmit ? (
            <button type="button" className={layoutStyles.buttonPrimary} onClick={() => { void save(true); }}>
              Send for approval again
            </button>
          ) : null}
        </div>
        {product.approval_status === 'rejected' && !canResubmit ? (
          <p className={layoutStyles.muted}>This listing cannot be sent again. Contact an admin.</p>
        ) : null}
        {message ? <p role="status" className={layoutStyles.statusNote}>{message}</p> : null}
      </form>
    </div>
  );
}
