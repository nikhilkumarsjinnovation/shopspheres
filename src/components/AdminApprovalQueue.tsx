'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { Json } from '@/types/database.types';
import ProductThumbnail from '@/components/ProductThumbnail';

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
      setErrorMessage('A rejection reason is required.');
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
    <div>
      <div>
        <div>
          <span>Pending Product Approvals</span>
          <span>
            {pendingProducts.length} Awaiting Review
          </span>
        </div>
        <span>
          Enterprise Merchant Compliance Gate
        </span>
      </div>

      {toastMessage && <div>{toastMessage}</div>}
      {errorMessage && (
        <div
        >
          {errorMessage}
        </div>
      )}

      <div>
        {pendingProducts.length === 0 ? (
          <div>
            <div></div>
            <p>
              Approval Queue Cleared
            </p>
            <p>
              All submitted products have been reviewed. When sellers onboard new items, they will appear
              here for administrator inspection.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Details</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Price & Stock</th>
                <th>Seller ID</th>
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
                      <div>
                        <Link href={`/admin/catalog/${product.id}`}>{product.title}</Link>
                      </div>
                      {product.sub_category && (
                        <div>
                          {product.sub_category}
                        </div>
                      )}
                      {specCount > 0 && (
                        <div>
                          <span>
                            ⚡ {specCount} enterprise specs
                          </span>
                        </div>
                      )}
                      <div>
                        <Link href={`/admin/catalog/${product.id}`}>View full details</Link>
                      </div>
                    </td>

                    <td>
                      {product.category}
                    </td>

                    <td>
                      <span
                      >
                        {product.condition || 'New'}
                      </span>
                    </td>

                    <td>
                      <div>
                        ${Number(product.price).toFixed(2)}
                      </div>
                      <div>
                        {product.stock} units
                      </div>
                    </td>

                    <td>
                      <span title={product.seller_id}>
                        {product.seller_id.slice(0, 8)}...
                      </span>
                    </td>

                    <td>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(product.id, product.title, 'approved')
                          }
                          disabled={isOperating}
                          title="Approve listing and make live to customers"
                        >
                          <span>✓</span>
                          <span>{isOperating ? 'Saving...' : 'Approve'}</span>
                        </button>

                        <input
                          value={reasons[product.id] ?? ''}
                          onChange={(event) =>
                            setReasons((current) => ({ ...current, [product.id]: event.target.value }))
                          }
                          placeholder="Rejection reason"
                          disabled={isOperating}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(product.id, product.title, 'rejected')
                          }
                          disabled={isOperating}
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
