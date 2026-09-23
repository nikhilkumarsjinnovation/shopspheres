import { style, keyframes } from '@vanilla-extract/css';

const pulseKeyframe = keyframes({
  '0%': { opacity: 0.6 },
  '50%': { opacity: 1 },
  '100%': { opacity: 0.6 },
});

export const content = style({
  padding: '2rem',
  maxWidth: '1200px',
  width: '100%',
  boxSizing: 'border-box',
});

/* Multi-Step Wizard Navigation */
export const wizardProgressContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '2rem',
  backgroundColor: '#ffffff',
  padding: '1rem 1.5rem',
  borderRadius: '10px',
  border: '1px solid #c5cedc',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
});

export const wizardStep = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const wizardStepCircle = style({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#e8edf4',
  color: '#5a6578',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '0.85rem',
  border: '1px solid #9aabbf',
});

export const wizardStepCircleActive = style({
  backgroundColor: '#2457ff',
  color: '#ffffff',
  borderColor: '#2457ff',
  boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
});

export const wizardStepCircleCompleted = style({
  backgroundColor: '#0f7a4c',
  color: '#ffffff',
  borderColor: '#0f7a4c',
});

export const wizardStepText = style({
  display: 'flex',
  flexDirection: 'column',
});

export const wizardStepTitle = style({
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#07101f',
});

export const wizardStepSubtitle = style({
  fontSize: '0.75rem',
  color: '#5a6578',
});

export const wizardDivider = style({
  flex: 1,
  height: '2px',
  backgroundColor: '#c5cedc',
  margin: '0 1rem',
});

/* Step 1: Path Selection Cards */
export const pathSelectionGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '1.5rem',
});

export const pathCard = style({
  backgroundColor: '#ffffff',
  border: '2px solid #c5cedc',
  borderRadius: '12px',
  padding: '2rem 1.75rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
  ':hover': {
    borderColor: '#7c3aed',
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 16px rgba(124, 58, 237, 0.1)',
  },
});

export const pathCardManual = style({
  ':hover': {
    borderColor: '#0f172a',
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
  },
});

export const pathBadge = style({
  alignSelf: 'flex-start',
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '1rem',
});

export const pathBadgeAI = style({
  backgroundColor: '#f5f3ff',
  color: '#7c3aed',
  border: '1px solid #ddd6fe',
});

export const pathBadgeManual = style({
  backgroundColor: '#e8edf4',
  color: '#475569',
  border: '1px solid #9aabbf',
});

export const pathCardTitle = style({
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 0.5rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const pathCardDesc = style({
  fontSize: '0.9rem',
  color: '#5a6578',
  lineHeight: 1.5,
  margin: '0 0 1.5rem 0',
});

export const pathFeaturesList = style({
  listStyle: 'none',
  padding: 0,
  margin: '0 0 2rem 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const pathFeatureItem = style({
  fontSize: '0.85rem',
  color: '#334155',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const pathButton = style({
  width: '100%',
  padding: '0.85rem 1.25rem',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.95rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  textAlign: 'center',
});

export const pathButtonAI = style({
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  ':hover': {
    backgroundColor: '#6d28d9',
  },
});

export const pathButtonManual = style({
  backgroundColor: '#0f172a',
  color: '#ffffff',
  ':hover': {
    backgroundColor: '#07101f',
  },
});

/* Skeleton Loading State for AI */
export const skeletonCard = style({
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #c5cedc',
  padding: '2.5rem 2rem',
  textAlign: 'center',
});

export const skeletonPulseText = style({
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#7c3aed',
  marginBottom: '0.5rem',
  animation: `${pulseKeyframe} 1.5s ease-in-out infinite`,
});

export const skeletonSubtext = style({
  fontSize: '0.85rem',
  color: '#5a6578',
  marginBottom: '2rem',
});

export const skeletonGrid = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  maxWidth: '600px',
  margin: '0 auto',
});

export const skeletonBar = style({
  height: '24px',
  backgroundColor: '#e8edf4',
  borderRadius: '6px',
  animation: `${pulseKeyframe} 1.2s ease-in-out infinite`,
});

/* Form Card and Elements */
export const formCard = style({
  backgroundColor: '#ffffff',
  border: '1px solid #c5cedc',
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.75rem',
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
  fontSize: '1.05rem',
  fontWeight: 700,
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
  border: '1px solid #9aabbf',
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

export const select = style({
  width: '100%',
  padding: '0.65rem 0.875rem',
  fontSize: '0.95rem',
  border: '1px solid #9aabbf',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: '#ffffff',
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
  border: '1px solid #9aabbf',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  minHeight: '100px',
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

/* Dynamic Attributes Grid (Amazon-level 10+ Specs) */
export const attributesContainer = style({
  backgroundColor: '#f8fafc',
  border: '1px solid #c5cedc',
  borderRadius: '8px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const attributeRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1.5fr 40px',
  gap: '0.75rem',
  alignItems: 'center',
});

export const removeAttrBtn = style({
  height: '36px',
  width: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fee2e2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.85rem',
  ':hover': {
    backgroundColor: '#fecaca',
  },
});

export const addAttrBtn = style({
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.85rem',
  backgroundColor: '#ffffff',
  color: '#2457ff',
  border: '1px dashed #93c5fd',
  borderRadius: '6px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
});

/* Compliance & Consent Checkbox Section */
export const consentCard = style({
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const consentLabel = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#92400e',
});

export const consentCheckbox = style({
  width: '18px',
  height: '18px',
  marginTop: '2px',
  cursor: 'pointer',
});

export const consentWarning = style({
  fontSize: '0.8rem',
  color: '#b45309',
  paddingLeft: '1.9rem',
  margin: 0,
});

/* AI Badge & Tags */
export const aiBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.65rem',
  backgroundColor: '#f5f3ff',
  color: '#7c3aed',
  border: '1px solid #ddd6fe',
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
  backgroundColor: '#e8edf4',
  border: '1px solid #c5cedc',
  borderRadius: '4px',
  fontSize: '0.8rem',
  color: '#475569',
});

/* Radix Separator */
export const separator = style({
  height: '1px',
  backgroundColor: '#c5cedc',
  margin: '0.25rem 0',
  width: '100%',
});

/* Radix UI Tabs (Dynamic Category Tabs for Inventory) */
export const tabsRoot = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const tabsList = style({
  display: 'flex',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  gap: '0.5rem',
  borderBottom: '1px solid #c5cedc',
  paddingBottom: '2px',
});

export const tabTrigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  backgroundColor: 'transparent',
  color: '#5a6578',
  border: 'none',
  borderBottom: '2px solid transparent',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
  ':hover': {
    color: '#0f172a',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  selectors: {
    '&[data-state="active"]': {
      color: '#2457ff',
      borderBottomColor: '#2457ff',
    },
  },
});

export const tabCountBadge = style({
  fontSize: '0.75rem',
  fontWeight: 700,
  padding: '0.1rem 0.45rem',
  borderRadius: '9999px',
  backgroundColor: '#e8edf4',
  color: '#475569',
  selectors: {
    '[data-state="active"] > &': {
      backgroundColor: '#eff6ff',
      color: '#2457ff',
    },
  },
});

export const tabsContent = style({
  outline: 'none',
});

/* Status Badges */
export const statusBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'capitalize',
});

export const statusBadgePending = style({
  backgroundColor: '#fef9c3',
  color: '#854d0e',
  border: '1px solid #fde047',
});

export const statusBadgeApproved = style({
  backgroundColor: '#ecfdf5',
  color: '#065f46',
  border: '1px solid #a7f3d0',
});

export const statusBadgeRejected = style({
  backgroundColor: '#fef2f2',
  color: '#991b1b',
  border: '1px solid #fecaca',
});

export const conditionBadge = style({
  fontSize: '0.75rem',
  fontWeight: 600,
  backgroundColor: '#e8edf4',
  color: '#334155',
  padding: '0.15rem 0.45rem',
  borderRadius: '4px',
  border: '1px solid #c5cedc',
});

/* Metrics Cards Grid */
export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
  marginBottom: '2rem',
});

export const metricCard = style({
  backgroundColor: '#ffffff',
  border: '1px solid #c5cedc',
  borderRadius: '8px',
  padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
});

export const metricLabel = style({
  fontSize: '0.85rem',
  color: '#5a6578',
  margin: '0 0 0.5rem 0',
});

export const metricValue = style({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
});

/* Table Styles */
export const tableContainer = style({
  backgroundColor: '#ffffff',
  border: '1px solid #c5cedc',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
});

export const tableHeader = style({
  padding: '1rem 1.5rem',
  borderBottom: '1px solid #c5cedc',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const tableTitle = style({
  fontSize: '1.1rem',
  fontWeight: 600,
  margin: 0,
  color: '#0f172a',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.9rem',
});

export const th = style({
  backgroundColor: '#f8fafc',
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: '#475569',
  borderBottom: '1px solid #c5cedc',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

export const td = style({
  padding: '1rem',
  borderBottom: '1px solid #e8edf4',
  verticalAlign: 'middle',
});

export const tr = style({
  ':hover': {
    backgroundColor: '#f8fafc',
  },
});

export const emptyState = style({
  padding: '4rem 2rem',
  textAlign: 'center',
  color: '#5a6578',
});

/* Primary Buttons */
export const buttonPrimary = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.85rem 1.75rem',
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
    backgroundColor: '#07101f',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const buttonSecondary = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.65rem 1rem',
  backgroundColor: '#e8edf4',
  color: '#334155',
  border: '1px solid #9aabbf',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: '#c5cedc',
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
  border: '1px solid #9aabbf',
});
