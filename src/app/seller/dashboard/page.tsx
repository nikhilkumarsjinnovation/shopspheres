import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import styles from '../seller.module.css';

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Query products belonging strictly to the currently logged-in seller
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  const productList = products || [];

  const totalProducts = productList.length;
  const totalValue = productList.reduce((sum, item) => sum + Number(item.price), 0);

  return (
    <>
      <header className={styles.topBar}>
        <h1 className={styles.pageHeading}>Merchant Inventory Dashboard</h1>
        <Link href="/seller/add-product" className={styles.buttonPrimary}>
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

        {/* Metrics Summary */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Total Listed Products</p>
            <p className={styles.metricValue}>{totalProducts}</p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Total Catalog Value</p>
            <p className={styles.metricValue}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Fulfillment Status</p>
            <p className={styles.metricValue} style={{ color: '#059669', fontSize: '1.4rem' }}>
              Active
            </p>
          </div>
        </div>

        {/* Products Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Your Product Inventory ({totalProducts})</h2>
          </div>

          {productList.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <h3 className={styles.emptyTitle}>No products in your catalog yet</h3>
              <p className={styles.emptyText}>
                Start selling by listing your first product on the ShopSphere marketplace.
              </p>
              <Link href="/seller/add-product" className={styles.buttonPrimary}>
                Add Your First Product
              </Link>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ width: '64px' }}>Image</th>
                  <th className={styles.th}>Product Details</th>
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Price</th>
                  <th className={styles.th}>Stock</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {productList.map((product) => {
                  const hasImage = product.image_urls && product.image_urls.length > 0;
                  const firstImage = hasImage ? product.image_urls[0] : null;

                  return (
                    <tr key={product.id} className={styles.tr}>
                      <td className={styles.td}>
                        {firstImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstImage}
                            alt={product.title}
                            className={styles.productThumb}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={styles.placeholderThumb}>No Img</div>
                        )}
                      </td>
                      <td className={styles.td}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{product.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {product.description}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                          {product.category}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <strong style={{ color: '#0f172a' }}>
                          ${Number(product.price).toFixed(2)}
                        </strong>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontSize: '0.9rem', color: product.stock > 0 ? '#059669' : '#dc2626' }}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(product.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
