import { style } from '@vanilla-extract/css';

export const layoutContainer = style({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#090d16',
  color: '#f8fafc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
});

/* Left Sidebar - Distinct Dark Theme */
export const sidebar = style({
  width: '280px',
  minWidth: '280px',
  backgroundColor: '#0b0f19',
  borderRight: '1px solid #1e293b',
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100vh',
  padding: '1.75rem 1.25rem',
  boxSizing: 'border-box',
  zIndex: 30,
});

export const brandSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
});

export const brandRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const brandTitle = style({
  fontSize: '1.25rem',
  fontWeight: 800,
  letterSpacing: '-0.025em',
  color: '#ffffff',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const adminBadge = style({
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#f43f5e',
  backgroundColor: 'rgba(244, 63, 94, 0.12)',
  border: '1px solid rgba(244, 63, 94, 0.3)',
  padding: '0.2rem 0.5rem',
  borderRadius: '9999px',
});

export const brandSubtitle = style({
  fontSize: '0.75rem',
  color: '#64748b',
  margin: 0,
});

/* Radix Separator Primitive Styling */
export const separator = style({
  height: '1px',
  backgroundColor: '#1e293b',
  margin: '1.25rem 0',
  width: '100%',
});

export const navSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  flex: 1,
});

export const navSectionLabel = style({
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#475569',
  marginBottom: '0.5rem',
  paddingLeft: '0.75rem',
});

export const navItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 0.85rem',
  borderRadius: '8px',
  color: '#94a3b8',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: '#131b2e',
    color: '#ffffff',
  },
});

export const navItemActive = style({
  backgroundColor: '#1e293b',
  color: '#38bdf8',
  fontWeight: 600,
  ':hover': {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
  },
});

export const sidebarFooter = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingTop: '0.5rem',
});

export const adminProfileCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem',
  borderRadius: '8px',
  backgroundColor: '#131b2e',
  border: '1px solid #1e293b',
});

export const adminAvatar = style({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#f43f5e',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '0.85rem',
  flexShrink: 0,
});

export const adminDetails = style({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
});

export const adminEmail = style({
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#f1f5f9',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const adminRole = style({
  fontSize: '0.7rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

/* Main Content Area */
export const mainContent = style({
  flex: 1,
  padding: '2.5rem 3rem',
  overflowY: 'auto',
  backgroundColor: '#090d16',
  minWidth: 0,
});

export const header = style({
  marginBottom: '2.5rem',
});

export const headerTitle = style({
  fontSize: '1.875rem',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  color: '#ffffff',
  margin: '0 0 0.5rem 0',
});

export const headerSubtitle = style({
  fontSize: '0.95rem',
  color: '#94a3b8',
  margin: 0,
});

/* Metrics Cards Grid */
export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2.5rem',
});

export const metricCard = style({
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  transition: 'border-color 0.2s ease, transform 0.2s ease',
  ':hover': {
    borderColor: '#334155',
    transform: 'translateY(-2px)',
  },
});

export const metricTopRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const metricLabel = style({
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94a3b8',
});

export const metricIconContainer = style({
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#1e293b',
});

export const metricValue = style({
  fontSize: '2.25rem',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: '#ffffff',
  margin: '0.25rem 0 0 0',
});

export const metricSubtext = style({
  fontSize: '0.8rem',
  color: '#10b981',
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
});

/* Recent Orders Table */
export const sectionTitle = style({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#ffffff',
  margin: '0 0 1rem 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const tableWrapper = style({
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.875rem',
});

export const th = style({
  backgroundColor: '#131b2e',
  color: '#94a3b8',
  fontWeight: 600,
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
  padding: '1rem 1.25rem',
  borderBottom: '1px solid #1e293b',
});

export const td = style({
  padding: '1rem 1.25rem',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
});

export const tr = style({
  transition: 'background-color 0.15s ease',
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
});

export const uuidCell = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.8rem',
  color: '#38bdf8',
});

export const statusBadge = style({
  display: 'inline-block',
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'capitalize',
});

export const statusPending = style({
  backgroundColor: 'rgba(234, 179, 8, 0.15)',
  color: '#facc15',
  border: '1px solid rgba(234, 179, 8, 0.3)',
});

export const statusProcessing = style({
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  color: '#60a5fa',
  border: '1px solid rgba(59, 130, 246, 0.3)',
});

export const statusShipped = style({
  backgroundColor: 'rgba(168, 85, 247, 0.15)',
  color: '#c084fc',
  border: '1px solid rgba(168, 85, 247, 0.3)',
});

export const statusDelivered = style({
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  color: '#4ade80',
  border: '1px solid rgba(34, 197, 94, 0.3)',
});

export const statusCancelled = style({
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.3)',
});

export const emptyState = style({
  padding: '3rem',
  textAlign: 'center',
  color: '#64748b',
});

/* Admin Approval Queue Styles */
export const approvalSection = style({
  marginBottom: '3rem',
});

export const actionButtonGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const approveBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.4rem 0.75rem',
  backgroundColor: '#059669',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  ':hover': {
    backgroundColor: '#047857',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const rejectBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.4rem 0.75rem',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const specCountChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.2rem 0.5rem',
  backgroundColor: '#1e293b',
  color: '#38bdf8',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: 500,
});

export const queueBadge = style({
  fontSize: '0.75rem',
  fontWeight: 700,
  padding: '0.2rem 0.6rem',
  borderRadius: '9999px',
  backgroundColor: 'rgba(245, 158, 11, 0.15)',
  color: '#fbbf24',
  border: '1px solid rgba(245, 158, 11, 0.3)',
});

export const queueSuccessToast = style({
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  color: '#34d399',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  fontSize: '0.875rem',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

