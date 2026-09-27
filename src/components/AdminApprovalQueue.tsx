'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR } from '@/lib/formatters';
import type { Json } from '@/types/database.types';
import ProductThumbnail from '@/components/ProductThumbnail';
import { Check, X, ShieldCheck, ExternalLink } from 'lucide-react';

export type QueueProduct = {
  id: string;
  title: string;
  price: number;
  stock: number;
  category: string;
  sub_category: string | null;
  condition: string;
  seller_id: string;
  image_urls: string[];
  attributes: Json;
};

interface AdminApprovalQueueProps {
  initialPendingProducts: QueueProduct[];
}

export default function AdminApprovalQueue({
  initialPendingProducts,
}: AdminApprovalQueueProps) {
  const router = useRouter();

  const [pendingProducts, setPendingProducts] = useState<QueueProduct[]>(initialPendingProducts);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateStatus = async (
    productId: string,
    productTitle: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    const rejectionReason = (reasons[productId] ?? '').trim();
    if (newStatus === 'rejected' && !rejectionReason) {
      setErrorMessage('A rejection reason is required before rejecting a listing.');
      return;
    }
    setLoadingId(productId);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      const response = await fetchWithCsrf(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: newStatus, rejection_reason: rejectionReason }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update this product.');
      }

      setPendingProducts((prev) => prev.filter((p) => p.id !== productId));

      if (newStatus === 'approved') {
        setToastMessage(`✓ Approved "${productTitle}"! Product is now published to the marketplace catalog.`);
      } else {
        setToastMessage(`Rejected "${productTitle}". Notification sent to merchant.`);
      }

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update product approval status.';
      setErrorMessage(msg);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Product Moderation Queue</h2>
            <span className="portal-badge pending">
              {pendingProducts.length} Awaiting Review
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
            Marketplace compliance and catalog quality gate. Review seller submissions before publishing.
          </p>
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--accent-electric)', fontWeight: 600 }}>
          <ShieldCheck size={16} /> Administrator Clearance Active
        </span>
      </div>

      {toastMessage && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
          {toastMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          {errorMessage}
        </div>
      )}

      {pendingProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Approval Queue Cleared
          </h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
            All submitted products have been reviewed. When sellers onboard new items, they will appear here for administrator inspection.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Image</th>
                <th>Product Details</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Price & Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingProducts.map((product) => {
                const firstImage =
                  product.image_urls && product.image_urls.length > 0
                    ? product.image_urls[0]
                    : null;

                const attributesObj =
                  typeof product.attributes === 'object' && product.attributes !== null
                    ? (product.attributes as Record<string, string>)
                    : {};

                const specCount = Object.keys(attributesObj).length;
                const isOperating = loadingId === product.id;

                return (
                  <tr key={product.id}>
                    <td>
                      <ProductThumbnail src={firstImage} alt={product.title} />
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>
                        <Link href={`/admin/catalog/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {product.title}
                        </Link>
                      </div>
                      {product.sub_category && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.15rem' }}>
                          {product.sub_category}
                        </div>
                      )}
                      {specCount > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-electric)', marginTop: '0.15rem', fontWeight: 500 }}>
                          ⚡ {specCount} enterprise specs
                        </div>
                      )}
                      <div style={{ marginTop: '0.35rem' }}>
                        <Link href={`/admin/catalog/${product.id}`} style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textDecoration: 'underline' }}>
                          View full spec sheet &rarr;
                        </Link>
                      </div>
                    </td>

                    <td>
                      <span className="section-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                        {product.category}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>
                        {product.condition || 'New'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg-primary)' }}>
                        {formatINR(Number(product.price))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.15rem' }}>
                        {product.stock} units
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '220px' }}>
                        <button
                          type="button"
                          className="btn-card-add"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'var(--success)', justifyContent: 'center' }}
                          onClick={() => handleUpdateStatus(product.id, product.title, 'approved')}
                          disabled={isOperating}
                          title="Approve listing and make live to customers"
                        >
                          <Check size={14} />
                          <span>{isOperating ? 'Saving…' : 'Approve & Publish'}</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <input
                            className="auth-input"
                            style={{ height: '2.1rem', fontSize: '0.75rem', padding: '0 0.5rem' }}
                            value={reasons[product.id] ?? ''}
                            onChange={(event) =>
                              setReasons((current) => ({ ...current, [product.id]: event.target.value }))
                            }
                            placeholder="Rejection reason…"
                            disabled={isOperating}
                          />
                          <button
                            type="button"
                            className="btn-card-toggle"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                            onClick={() => handleUpdateStatus(product.id, product.title, 'rejected')}
                            disabled={isOperating}
                            title="Reject listing"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
