'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import type { Product } from '@/types/database.types';
import ProductThumbnail from '@/components/ProductThumbnail';

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
          <span>
            <span>✅</span> Approved
          </span>
        );
      case 'rejected':
        return (
          <span>
            <span>❌</span> Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span>
            <span>⏳</span> Pending Review
          </span>
        );
    }
  };

  const renderProductsTable = (items: Product[]) => {
    if (items.length === 0) {
      return (
        <div>
          <div>📦</div>
          <h3>
            No products in this category
          </h3>
          <p>
            List a new product under this category to populate this inventory tab.
          </p>
          <Link href="/seller/add-product">
            Add Product
          </Link>
        </div>
      );
    }

    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Product Details</th>
              <th>Condition</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Approval Status</th>
              <th>Created</th>
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
                    <div>{product.title}</div>
                    {product.sub_category && (
                      <div>
                        {product.sub_category}
                      </div>
                    )}
                    {specCount > 0 && (
                      <div>
                        ⚡ {specCount} enterprise specifications
                      </div>
                    )}
                  </td>

                  <td>
                    <span>
                      {product.condition || 'New'}
                    </span>
                  </td>

                  <td>
                    <span>
                      {product.category}
                    </span>
                  </td>

                  <td>
                    <strong>
                      ${Number(product.price).toFixed(2)}
                    </strong>
                  </td>

                  <td>
                    <span
                    >
                      {product.stock} in stock
                    </span>
                  </td>

                  <td>
                    {getStatusBadge(product.approval_status || 'pending')}
                  </td>

                  <td
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
      <div>
        <div>
          <div>📦</div>
          <h3>
            No products in your catalog yet
          </h3>
          <p>
            Start onboarding products using our AI-assisted enterprise pipeline or manual entry.
          </p>
          <Link href="/seller/add-product">
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
    >
      {/* Dynamically Generated Radix Tabs List */}
      <Tabs.List aria-label="Filter inventory by category">
        {/* All Products Tab */}
        <Tabs.Trigger value="all">
          <span>All Products</span>
          <span>{products.length}</span>
        </Tabs.Trigger>

        {/* Dynamic Category Tabs */}
        {uniqueCategories.map((cat) => {
          const count = products.filter((p) => (p.category?.trim() || 'General') === cat).length;
          return (
            <Tabs.Trigger key={cat} value={cat}>
              <span>{cat}</span>
              <span>{count}</span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      {/* Tab Content: All Products */}
      <Tabs.Content value="all">
        {renderProductsTable(products)}
      </Tabs.Content>

      {/* Tab Content: Category-specific */}
      {uniqueCategories.map((cat) => {
        const filtered = products.filter((p) => (p.category?.trim() || 'General') === cat);
        return (
          <Tabs.Content key={cat} value={cat}>
            {renderProductsTable(filtered)}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
