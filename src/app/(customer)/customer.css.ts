import { style } from '@vanilla-extract/css';

export const layout = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f8fafc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  color: '#0f172a',
});

/* Top Navigation Bar */
export const navbar = style({
  position: 'sticky',
  top: 0,
  zIndex: 40,
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  padding: '0 2rem',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
});

export const navLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '2.5rem',
});

export const brandTitle = style({
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#0f172a',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const brandBadge = style({
  fontSize: '0.7rem',
  fontWeight: 600,
  color: '#2563eb',
  backgroundColor: '#eff6ff',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

export const navLinks = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
});

export const navLink = style({
  color: '#64748b',
  textDecoration: 'none',
  fontSize: '0.925rem',
  fontWeight: 500,
  transition: 'color 0.15s ease',
  ':hover': {
    color: '#0f172a',
  },
});

export const navLinkActive = style({
  color: '#0f172a',
  fontWeight: 600,
  borderBottom: '2px solid #2563eb',
  paddingBottom: '2px',
});

export const navRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1.25rem',
});

export const cartLink = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.85rem',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: '#f1f5f9',
    borderColor: '#94a3b8',
  },
});

export const cartBadge = style({
  position: 'absolute',
  top: '-7px',
  right: '-7px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.75rem',
  fontWeight: 700,
  borderRadius: '9999px',
  minWidth: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 4px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
});

export const mainContent = style({
  flex: 1,
  maxWidth: '1200px',
  width: '100%',
  margin: '0 auto',
  padding: '2rem',
  boxSizing: 'border-box',
});

/* Headers */
export const headerContainer = style({
  marginBottom: '2rem',
});

export const heading = style({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 0.5rem 0',
});

export const subheading = style({
  fontSize: '0.95rem',
  color: '#64748b',
  margin: 0,
});

/* Product Grid (Explore Page) */
export const productGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '1.5rem',
});

export const productCard = style({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
  },
});

export const cardImageContainer = style({
  width: '100%',
  height: '180px',
  backgroundColor: '#f1f5f9',
  overflow: 'hidden',
  position: 'relative',
});

export const cardImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const cardPlaceholderImage = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  fontSize: '0.85rem',
  backgroundColor: '#f1f5f9',
});

export const cardBody = style({
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

export const cardCategory = style({
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: '#2563eb',
  marginBottom: '0.35rem',
  letterSpacing: '0.03em',
});

export const cardTitle = style({
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#0f172a',
  margin: '0 0 0.5rem 0',
  lineHeight: 1.3,
});

export const cardDescription = style({
  fontSize: '0.85rem',
  color: '#64748b',
  margin: '0 0 1rem 0',
  flex: 1,
  lineHeight: 1.4,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const cardFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 'auto',
  paddingTop: '0.75rem',
  borderTop: '1px solid #f1f5f9',
});

export const cardPrice = style({
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#0f172a',
});

export const buttonAddToCart = style({
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '0.5rem 0.85rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  ':hover': {
    backgroundColor: '#1e293b',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

/* Checkout Page Styles */
export const checkoutLayout = style({
  display: 'grid',
  gridTemplateColumns: '1fr 380px',
  gap: '2rem',
  '@media': {
    'screen and (max-width: 860px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const checkoutSection = style({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '1.75rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  marginBottom: '1.5rem',
});

export const sectionTitle = style({
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 1.25rem 0',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #f1f5f9',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  marginBottom: '1rem',
});

export const label = style({
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#334155',
});

export const input = style({
  padding: '0.625rem 0.85rem',
  fontSize: '0.925rem',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
  ':focus': {
    borderColor: '#2563eb',
  },
});

/* Gift Box Toggle Styles */
export const giftToggleContainer = style({
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '1.25rem',
  marginBottom: '1rem',
});

export const giftCheckboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#0f172a',
  userSelect: 'none',
});

export const giftFieldsContainer = style({
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: '1px dashed #cbd5e1',
});

export const giftNotice = style({
  fontSize: '0.8rem',
  color: '#64748b',
  backgroundColor: '#f1f5f9',
  padding: '0.6rem 0.85rem',
  borderRadius: '6px',
  marginTop: '0.5rem',
});

/* Order Summary Box */
export const summaryCard = style({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '1.75rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  position: 'sticky',
  top: '80px',
});

export const summaryItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.9rem',
  color: '#475569',
  marginBottom: '0.75rem',
});

export const summaryTotal = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '1.2rem',
  fontWeight: 700,
  color: '#0f172a',
  paddingTop: '0.75rem',
  borderTop: '2px solid #e2e8f0',
  marginTop: '1rem',
  marginBottom: '1.5rem',
});

export const cartItemList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '1.25rem',
});

export const cartRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '0.875rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #f1f5f9',
});

export const buttonCheckout = style({
  width: '100%',
  backgroundColor: '#059669',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '0.85rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#047857',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

/* Alert & Notice Messages */
export const alertSuccess = style({
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
  padding: '1rem',
  borderRadius: '6px',
  marginBottom: '1.5rem',
  fontSize: '0.9rem',
});

export const alertError = style({
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  padding: '1rem',
  borderRadius: '6px',
  marginBottom: '1.5rem',
  fontSize: '0.9rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  color: '#64748b',
});
