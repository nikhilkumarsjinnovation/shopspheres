import { style } from '@vanilla-extract/css';

export const content = style({
  padding: '2rem',
  maxWidth: '850px',
  width: '100%',
  boxSizing: 'border-box',
});

export const formCard = style({
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '2rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const formSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
});

export const sectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.25rem',
});

export const sectionTitle = style({
  fontSize: '1rem',
  fontWeight: 600,
  color: '#0f172a',
  margin: 0,
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#334155',
});

export const input = style({
  width: '100%',
  padding: '0.65rem 0.875rem',
  fontSize: '0.95rem',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ':focus': {
    borderColor: '#0284c7',
    boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)',
  },
});

export const textarea = style({
  width: '100%',
  padding: '0.65rem 0.875rem',
  fontSize: '0.95rem',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  minHeight: '110px',
  resize: 'vertical',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ':focus': {
    borderColor: '#0284c7',
    boxShadow: '0 0 0 3px rgba(2, 132, 199, 0.15)',
  },
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1.25rem',
});

/* AI Auto-Categorize Button */
export const aiButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.55rem 1rem',
  backgroundColor: '#f5f3ff',
  color: '#7c3aed',
  border: '1px solid #ddd6fe',
  borderRadius: '6px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    backgroundColor: '#ede9fe',
    borderColor: '#c4b5fd',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const aiBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.65rem',
  backgroundColor: '#ecfdf5',
  color: '#065f46',
  border: '1px solid #a7f3d0',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
});

export const tagsContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.5rem',
});

export const tagChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.6rem',
  backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  fontSize: '0.8rem',
  color: '#475569',
});

/* Radix Separator Styling */
export const separator = style({
  height: '1px',
  backgroundColor: '#e2e8f0',
  margin: '0.5rem 0',
  width: '100%',
});

export const buttonPrimary = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#1e293b',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const alertError = style({
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  fontSize: '0.875rem',
  marginBottom: '1.25rem',
});

export const alertSuccess = style({
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  fontSize: '0.875rem',
  marginBottom: '1.25rem',
});

export const imagePreviewContainer = style({
  marginTop: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const imagePreview = style({
  width: '80px',
  height: '80px',
  objectFit: 'cover',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
});
