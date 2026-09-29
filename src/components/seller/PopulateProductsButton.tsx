'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronDown, X } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function PopulateProductsButton({
  category,
  onSuccess,
}: {
  category?: string;
  onSuccess?: () => void;
}) {
  const [openModal, setOpenModal] = useState(false);
  const [countInput, setCountInput] = useState('10');
  const [condition, setCondition] = useState<string>('random');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handlePopulate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const parsedCount = parseInt(countInput, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      setIsError(true);
      setStatusMessage('Please enter a valid number (at least 1).');
      return;
    }

    if (parsedCount > 500) {
      setIsError(true);
      setStatusMessage('Maximum limit is 500 products at once.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await fetchWithCsrf('/api/v1/seller/populate-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: parsedCount,
          category,
          condition: condition === 'random' ? undefined : condition,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to populate products');
      }

      setIsError(false);
      const imgInfo = `Images: ${data.imagesFromRandomApi ?? 0} RandomAPI, ${data.imagesFromPexels ?? 0} Pexels, ${data.placeholderImages ?? 0} Fallback`;
      setStatusMessage(
        `Added ${data.inserted} product(s) (Pending Review). ${imgInfo}. Skipped ${data.skippedDuplicates} duplicate(s).`
      );
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setOpenModal(false);
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : 'Error populating products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
        <button
          type="button"
          onClick={() => {
            setStatusMessage(null);
            setIsError(false);
            setOpenModal(true);
          }}
          disabled={loading}
          className="btn-card-toggle"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: 'var(--bg-canvas)',
            borderColor: 'var(--accent-electric)',
            color: 'var(--fg-primary)',
            cursor: 'pointer',
          }}
          title="Quickly populate non-verified products using randomapi.dev"
        >
          <Sparkles size={15} style={{ color: 'var(--accent-electric)' }} />
          <span>Populate Products</span>
        </button>

        {statusMessage && (
          <span
            style={{
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: isError ? 'var(--danger)' : 'var(--success)',
              fontWeight: 600,
            }}
          >
            {isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {statusMessage}
          </span>
        )}
      </div>

      {openModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !loading && setOpenModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-electric)' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Populate Mock Products</h3>
              </div>
              <button
                type="button"
                onClick={() => !loading && setOpenModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePopulate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Number of Products to Populate (Max 500)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  placeholder="e.g. 25 or 500"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--fg-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Enter any quantity up to <strong>500</strong>. Products are generated via randomapi.dev.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Product Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--fg-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="random">Random Mix (New, Renewed, Used)</option>
                  <option value="New">New Only</option>
                  <option value="Renewed">Renewed Only</option>
                  <option value="Used">Used Only</option>
                </select>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  color: 'var(--fg-muted)',
                }}
              >
                🔒 <strong>Approval Note:</strong> All products are inserted in <span className="portal-badge pending" style={{ padding: '0.1rem 0.4rem', fontSize: '0.68rem' }}>PENDING</span> status awaiting admin verification. Duplicate products with the same title and condition are automatically skipped.
              </div>

              {statusMessage && (
                <div
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: isError ? 'var(--danger-bg)' : 'var(--success-bg)',
                    color: isError ? 'var(--danger)' : 'var(--success)',
                  }}
                >
                  {isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                  <span>{statusMessage}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  disabled={loading}
                  className="btn-card-toggle"
                  style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-card-add"
                  style={{
                    padding: '0.6rem 1.35rem',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Generating Products...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Populate {countInput || 0} Products</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
