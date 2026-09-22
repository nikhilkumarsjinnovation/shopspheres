'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import type { Product } from '@/types/database.types';
import ProductThumbnail from '@/components/ProductThumbnail';
import * as styles from '@/app/seller/seller.css';

interface SellerInventoryTabsProps {
  products: Product[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(isoString?: string | null) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default function SellerInventoryTabs({ products }: SellerInventoryTabsProps) {
  // Dynamically extract distinct categories that actually exist in the seller's inventory
  const uniqueCategories = Array.from(
    new Set(products.map((p) => p.category?.trim() || 'General'))
  ).sort();

  const [activeTab, setActiveTab] = useState<string>('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className={`${styles.statusBadge} ${styles.statusBadgeApproved}`}>
            <span>✅</span> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className={`${styles.statusBadge} ${styles.statusBadgeRejected}`}>
            <span>❌</span> Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className={`${styles.statusBadge} ${styles.statusBadgePending}`}>
            <span>⏳</span> Pending Review
          </span>
        );
    }
  };

  const renderProductsTable = (items: Product[]) => {
    if (items.length === 0) {
      return (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            No products in this category
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
            List a new product under this category to populate this inventory tab.
          </p>
          <Link href="/seller/add-product" className={styles.buttonPrimary}>
            Add Product
          </Link>
        </div>
      );
    }

    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: '64px' }}>Image</th>
              <th className={styles.th}>Product Details</th>
              <th className={styles.th}>Condition</th>
              <th className={styles.th}>Category</th>
              <th className={styles.th}>Price</th>
              <th className={styles.th}>Stock</th>
              <th className={styles.th}>Approval Status</th>
              <th className={styles.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product) => {
              const firstImage =
                product.image_urls && product.image_urls.length > 0
                  ? product.image_urls[0]
                  : null;

              const attributesObj =
                typeof product.attributes === 'object' && product.attributes !== null
                  ? (product.attributes as Record<string, string>)
                  : {};

              const specCount = Object.keys(attributesObj).length;

              return (
                <tr key={product.id} className={styles.tr}>
                  <td className={styles.td}>
                    <ProductThumbnail src={firstImage} alt={product.title} />
                  </td>

                  <td className={styles.td}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{product.title}</div>
                    {product.sub_category && (
                      <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '2px' }}>
                        {product.sub_category}
                      </div>
                    )}
                    {specCount > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                        ⚡ {specCount} enterprise specifications
                      </div>
                    )}
                  </td>

                  <td className={styles.td}>
                    <span className={styles.conditionBadge}>
                      {product.condition || 'New'}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                      {product.category}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <strong style={{ color: '#0f172a' }}>
                      ${Number(product.price).toFixed(2)}
                    </strong>
                  </td>

                  <td className={styles.td}>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: product.stock > 0 ? '#059669' : '#dc2626',
                      }}
                    >
                      {product.stock} in stock
                    </span>
                  </td>

                  <td className={styles.td}>
                    {getStatusBadge(product.approval_status || 'pending')}
                  </td>

                  <td
                    className={styles.td}
                    style={{ fontSize: '0.8rem', color: '#94a3b8' }}
                    suppressHydrationWarning
                  >
                    {formatDate(product.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (products.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            No products in your catalog yet
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
            Start onboarding products using our AI-assisted enterprise pipeline or manual entry.
          </p>
          <Link href="/seller/add-product" className={styles.buttonPrimary}>
            Add Your First Product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className={styles.tabsRoot}
    >
      {/* Dynamically Generated Radix Tabs List */}
      <Tabs.List className={styles.tabsList} aria-label="Filter inventory by category">
        {/* All Products Tab */}
        <Tabs.Trigger value="all" className={styles.tabTrigger}>
          <span>All Products</span>
          <span className={styles.tabCountBadge}>{products.length}</span>
        </Tabs.Trigger>

        {/* Dynamic Category Tabs */}
        {uniqueCategories.map((cat) => {
          const count = products.filter((p) => (p.category?.trim() || 'General') === cat).length;
          return (
            <Tabs.Trigger key={cat} value={cat} className={styles.tabTrigger}>
              <span>{cat}</span>
              <span className={styles.tabCountBadge}>{count}</span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      {/* Tab Content: All Products */}
      <Tabs.Content value="all" className={styles.tabsContent}>
        {renderProductsTable(products)}
      </Tabs.Content>

      {/* Tab Content: Category-specific */}
      {uniqueCategories.map((cat) => {
        const filtered = products.filter((p) => (p.category?.trim() || 'General') === cat);
        return (
          <Tabs.Content key={cat} value={cat} className={styles.tabsContent}>
            {renderProductsTable(filtered)}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
