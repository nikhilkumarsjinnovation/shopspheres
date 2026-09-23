'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function ProductEditor({
  product,
}: {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    sub_category: string | null;
    approval_status: string;
    resubmit_count: number;
    rejection_reason: string | null;
  };
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);
  const [category, setCategory] = useState(product.category);
  const [subCategory, setSubCategory] = useState(product.sub_category ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const locked = product.approval_status === 'approved';
  const canResubmit = product.approval_status === 'rejected' && product.resubmit_count < 3;

  const save = async (resubmit: boolean) => {
    const response = await fetchWithCsrf(`/api/v1/seller/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, price, stock, category, subCategory, resubmit }),
    });
    const payload: unknown = await response.json();
    setMessage(response.ok
      ? (resubmit ? 'Sent for approval again.' : 'Product saved.')
      : (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not save.'));
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); void save(false); }}>
      <p>Status: {product.approval_status}. Resubmits used: {product.resubmit_count} of 3.</p>
      {product.rejection_reason ? <p>Rejection note: {product.rejection_reason}</p> : null}
      {locked ? <p>This listing is approved. You can view it, not edit it.</p> : null}
      <label>Title <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={locked} /></label>
      <label>Description <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={locked} /></label>
      <label>Price <input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} disabled={locked} /></label>
      <label>Stock <input type="number" value={stock} onChange={(event) => setStock(Number(event.target.value))} disabled={locked} /></label>
      <label>Category <input value={category} onChange={(event) => setCategory(event.target.value)} disabled={locked} /></label>
      <label>Sub-category <input value={subCategory} onChange={(event) => setSubCategory(event.target.value)} disabled={locked} /></label>
      {product.approval_status === 'pending' ? <button type="submit">Save</button> : null}
      {canResubmit ? <button type="button" onClick={() => { void save(true); }}>Send for approval again</button> : null}
      {product.approval_status === 'rejected' && !canResubmit ? <p>This listing cannot be sent again. Contact an admin.</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
