'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types/database.types';
import ProductThumbnail from '@/components/ProductThumbnail';
import * as styles from '@/app/(admin)/admin.css';

interface AdminApprovalQueueProps {
  initialPendingProducts: Product[];
}

export default function AdminApprovalQueue({
  initialPendingProducts,
}: AdminApprovalQueueProps) {
  const router = useRouter();
  const supabase = createClient();

  const [pendingProducts, setPendingProducts] = useState<Product[]>(initialPendingProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateStatus = async (
    productId: string,
    productTitle: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    setLoadingId(productId);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      const { error } = await supabase
        .from('products')
        .update({ approval_status: newStatus })
        .eq('id', productId);

      if (error) {
        throw new Error(error.message);
      }

      // Optimistically remove from pending queue
      setPendingProducts((prev) => prev.filter((p) => p.id !== productId));

      if (newStatus === 'approved') {
        setToastMessage(`✅ Approved "${productTitle}"! Product is now live in the Customer catalog.`);
      } else {
        setToastMessage(`❌ Rejected "${productTitle}". Status set to rejected.`);
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
    <div className={styles.approvalSection}>
      <div className={styles.sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>Pending Product Approvals</span>
          <span className={styles.queueBadge}>
            {pendingProducts.length} Awaiting Review
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>
          Enterprise Merchant Compliance Gate
        </span>
      </div>

      {toastMessage && <div className={styles.queueSuccessToast}>{toastMessage}</div>}
      {errorMessage && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      <div className={styles.tableWrapper}>
        {pendingProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#f8fafc', fontSize: '1.05rem' }}>
              Approval Queue Cleared
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              All submitted products have been reviewed. When sellers onboard new items, they will appear
              here for administrator inspection.
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '56px' }}>Image</th>
                <th className={styles.th}>Product Details</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Condition</th>
                <th className={styles.th}>Price & Stock</th>
                <th className={styles.th}>Seller ID</th>
                <th className={styles.th} style={{ textAlign: 'center' }}>Actions</th>
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
                  <tr key={product.id} className={styles.tr}>
                    <td className={styles.td}>
                      <ProductThumbnail src={firstImage} alt={product.title} />
                    </td>

                    <td className={styles.td}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{product.title}</div>
                      {product.sub_category && (
                        <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '2px' }}>
                          {product.sub_category}
                        </div>
                      )}
                      {specCount > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <span className={styles.specCountChip}>
                            ⚡ {specCount} enterprise specs
                          </span>
                        </div>
                      )}
                    </td>

                    <td className={styles.td} style={{ color: '#cbd5e1' }}>
                      {product.category}
                    </td>

                    <td className={styles.td}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#1e293b',
                          color: '#f1f5f9',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {product.condition || 'New'}
                      </span>
                    </td>

                    <td className={styles.td}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        ${Number(product.price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {product.stock} units
                      </div>
                    </td>

                    <td className={styles.td}>
                      <span className={styles.uuidCell} title={product.seller_id}>
                        {product.seller_id.slice(0, 8)}...
                      </span>
                    </td>

                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      <div className={styles.actionButtonGroup} style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(product.id, product.title, 'approved')
                          }
                          disabled={isOperating}
                          className={styles.approveBtn}
                          title="Approve listing and make live to customers"
                        >
                          <span>✓</span>
                          <span>{isOperating ? 'Saving...' : 'Approve'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(product.id, product.title, 'rejected')
                          }
                          disabled={isOperating}
                          className={styles.rejectBtn}
                          title="Reject listing"
                        >
                          <span>✕</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
