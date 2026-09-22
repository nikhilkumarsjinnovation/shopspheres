import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/types/database.types';
import SellerInventoryTabs from '@/components/SellerInventoryTabs';
import * as styles from '../seller.css';
import layoutStyles from '../seller.module.css';

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Query products belonging strictly to the currently logged-in seller
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  const productList = (products || []) as Product[];

  const totalProducts = productList.length;
  const approvedCount = productList.filter((p) => p.approval_status === 'approved').length;
  const pendingCount = productList.filter((p) => (p.approval_status || 'pending') === 'pending').length;
  const totalValue = productList.reduce((sum, item) => sum + Number(item.price), 0);

  return (
    <>
      <header className={layoutStyles.topBar}>
        <div>
          <h1 className={layoutStyles.pageHeading}>Merchant Inventory Management</h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Enterprise dynamic catalog tabs, product specifications, and live approval status tracking.
          </p>
        </div>
        <Link href="/seller/add-product" className={layoutStyles.buttonPrimary}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </Link>
      </header>

      <div className={styles.content}>
        {error && (
          <div className={styles.alertError}>
            Failed to load products: {error.message}
          </div>
        )}

        {/* Metrics Summary Grid */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Total Catalog Products</p>
            <p className={styles.metricValue}>{totalProducts}</p>
          </div>

          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Approved & Live to Customers</p>
            <p className={styles.metricValue} style={{ color: '#059669' }}>
              {approvedCount}
            </p>
          </div>

          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Awaiting Administrator Review</p>
            <p className={styles.metricValue} style={{ color: '#d97706' }}>
              {pendingCount}
            </p>
          </div>

          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Total Inventory Value</p>
            <p className={styles.metricValue}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Dynamic Radix UI Category Tabs */}
        <SellerInventoryTabs products={productList} />
      </div>
    </>
  );
}
