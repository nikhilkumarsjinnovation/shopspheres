'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import type { Product } from '@/types/database.types';
import ProductThumbnail from '@/components/ProductThumbnail';
import { formatINR } from '@/lib/formatters';
import { Package, PlusCircle } from 'lucide-react';

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
          <span className="portal-badge active">
            ✓ Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="portal-badge rejected">
            ✕ Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="portal-badge pending">
            ⏳ In Review
          </span>
        );
    }
  };

  const renderProductsTable = (items: Product[]) => {
    if (items.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3.5rem 2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            No products in this category
          </h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            List a new product under this category to populate this inventory tab.
          </p>
          <Link href="/seller/add-product" className="btn-card-add" style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}>
            Add Product
          </Link>
        </div>
      );
    }

    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Image</th>
              <th>Product Details</th>
              <th>Condition</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Approval Status</th>
              <th>Created</th>
              <th>Action</th>
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
                <tr key={product.id}>
                  <td>
                    <ProductThumbnail src={firstImage} alt={product.title} />
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{product.title}</div>
                    {product.sub_category && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.15rem' }}>
                        {product.sub_category}
                      </div>
                    )}
                    {specCount > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-electric)', marginTop: '0.15rem', fontWeight: 500 }}>
                        ⚡ {specCount} enterprise specifications
                      </div>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>
                      {product.condition || 'New'}
                    </span>
                  </td>

                  <td>
                    <span className="section-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                      {product.category}
                    </span>
                  </td>

                  <td>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--fg-primary)' }}>
                      {formatINR(Number(product.price))}
                    </strong>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: (product.stock ?? 0) <= 5 ? 'var(--warning)' : 'var(--fg-secondary)' }}>
                      {product.stock} units
                    </span>
                  </td>

                  <td>
                    {getStatusBadge(product.approval_status || 'pending')}
                  </td>

                  <td suppressHydrationWarning style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                    {formatDate(product.created_at)}
                  </td>

                  <td>
                    <Link
                      href={`/seller/products/${product.id}`}
                      className="btn-card-toggle"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    >
                      Edit Listing
                    </Link>
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
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
        <Package size={36} style={{ margin: '0 auto 1rem', color: 'var(--fg-subtle)' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          No products in your catalog yet
        </h3>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          Start onboarding products using our AI-assisted enterprise pipeline or manual entry.
        </p>
        <Link href="/seller/add-product" className="btn-card-add" style={{ padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <PlusCircle size={15} /> Add Your First Product
        </Link>
      </div>
    );
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
    >
      {/* Dynamically Generated Radix Tabs List */}
      <Tabs.List className="seller-tabs-list" aria-label="Filter inventory by category">
        {/* All Products Tab */}
        <Tabs.Trigger value="all" className="seller-tab-trigger">
          <span>All Products</span>
          <span className="seller-tab-count">{products.length}</span>
        </Tabs.Trigger>

        {/* Dynamic Category Tabs */}
        {uniqueCategories.map((cat) => {
          const count = products.filter((p) => (p.category?.trim() || 'General') === cat).length;
          return (
            <Tabs.Trigger key={cat} value={cat} className="seller-tab-trigger">
              <span>{cat}</span>
              <span className="seller-tab-count">{count}</span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      {/* Tab Content: All Products */}
      <Tabs.Content value="all" style={{ outline: 'none' }}>
        {renderProductsTable(products)}
      </Tabs.Content>

      {/* Tab Content: Category-specific */}
      {uniqueCategories.map((cat) => {
        const filtered = products.filter((p) => (p.category?.trim() || 'General') === cat);
        return (
          <Tabs.Content key={cat} value={cat} style={{ outline: 'none' }}>
            {renderProductsTable(filtered)}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
