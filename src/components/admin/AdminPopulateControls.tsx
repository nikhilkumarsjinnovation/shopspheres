'use client';

import { useState } from 'react';
import { Store, PackagePlus, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function AdminPopulateControls({
  shops = [],
}: {
  shops: Array<{ id: string; name: string }>;
}) {
  const [shopCount, setShopCount] = useState<string>('3');
  const [productCount, setProductCount] = useState<string>('10');
  const [targetShop, setTargetShop] = useState<string>('all');
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'pending'>('approved');

  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handlePopulateShops = async () => {
    const parsedShopCount = parseInt(shopCount, 10);
    if (isNaN(parsedShopCount) || parsedShopCount < 1) {
      setMessage({ text: 'Please enter a valid number of shops (at least 1).', isError: true });
      return;
    }
    if (parsedShopCount > 100) {
      setMessage({ text: 'Maximum limit is 100 shops at once.', isError: true });
      return;
    }

    setLoadingShops(true);
    setMessage(null);

    try {
      const res = await fetchWithCsrf('/api/v1/admin/populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'populate_shops',
          count: parsedShopCount,
          productsPerShop: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to populate shops');

      setMessage({
        text: `Created ${data.shopsCreated} verified shop(s) with starter items.`,
        isError: false,
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error populating shops',
        isError: true,
      });
    } finally {
      setLoadingShops(false);
    }
  };

  const handlePopulateProducts = async () => {
    const parsedProductCount = parseInt(productCount, 10);
    if (isNaN(parsedProductCount) || parsedProductCount < 1) {
      setMessage({ text: 'Please enter a valid number of products (at least 1).', isError: true });
      return;
    }
    if (parsedProductCount > 500) {
      setMessage({ text: 'Maximum limit is 500 products per shop.', isError: true });
      return;
    }

    setLoadingProducts(true);
    setMessage(null);

    try {
      const res = await fetchWithCsrf('/api/v1/admin/populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'populate_products',
          targetShops: targetShop,
          count: parsedProductCount,
          approvalStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to populate products');

      const imgInfo = `Images: ${data.imagesFromRandomApi ?? 0} RandomAPI, ${data.imagesFromPexels ?? 0} Pexels, ${data.placeholderImages ?? 0} Fallback`;
      setMessage({
        text: `Inserted ${data.totalInserted} product(s) across ${data.shopsCount} shop(s). ${imgInfo}. Skipped ${data.totalSkippedDuplicates} duplicate(s).`,
        isError: false,
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error populating products',
        isError: true,
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-electric)' }} />
            <span>Mock Generator Suite (randomapi.dev)</span>
          </h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Instant testing tool: generate verified fake shops or populate products for single/all storefronts with deduplication.
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: message.isError ? 'var(--danger-bg)' : 'var(--success-bg)',
              color: message.isError ? 'var(--danger)' : 'var(--success)',
            }}
          >
            {message.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Box 1: Populate Shops */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <Store size={16} />
              <span>Populate Fake Shops</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
              Creates new verified merchant storefronts with Indian cities, geolocation, and verified seller logins.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center' }}>
              Shops (Max 100):
              <input
                type="number"
                min={1}
                max={100}
                value={shopCount}
                onChange={(e) => setShopCount(e.target.value)}
                placeholder="1-100"
                style={{
                  marginLeft: '0.4rem',
                  width: '75px',
                  padding: '0.35rem 0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg-primary)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              />
            </label>

            <button
              type="button"
              onClick={handlePopulateShops}
              disabled={loadingShops}
              className="btn-card-add"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginLeft: 'auto',
              }}
            >
              {loadingShops ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating {shopCount} Shops...</span>
                </>
              ) : (
                <>
                  <Store size={14} />
                  <span>Populate Shops</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Box 2: Populate Products */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <PackagePlus size={16} />
              <span>Bulk Populate Products</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
              Generates mock products for one or all shops. Deduplicates by title and condition (New, Renewed, Used).
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              Target:
              <select
                value={targetShop}
                onChange={(e) => setTargetShop(e.target.value)}
                style={{
                  marginLeft: '0.35rem',
                  maxWidth: '140px',
                  padding: '0.35rem 0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg-primary)',
                  fontSize: '0.8rem',
                }}
              >
                <option value="all">All Shops ({shops.length})</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center' }}>
              Qty (Max 500):
              <input
                type="number"
                min={1}
                max={500}
                value={productCount}
                onChange={(e) => setProductCount(e.target.value)}
                placeholder="1-500"
                style={{
                  marginLeft: '0.35rem',
                  width: '75px',
                  padding: '0.35rem 0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg-primary)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              />
            </label>

            <label style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              Status:
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as 'approved' | 'pending')}
                style={{
                  marginLeft: '0.35rem',
                  padding: '0.35rem 0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg-primary)',
                  fontSize: '0.8rem',
                }}
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handlePopulateProducts}
              disabled={loadingProducts}
              className="btn-card-toggle"
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginLeft: 'auto',
                borderColor: 'var(--accent-electric)',
                color: 'var(--fg-primary)',
              }}
            >
              {loadingProducts ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Populating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} style={{ color: 'var(--accent-electric)' }} />
                  <span>Populate Products</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
