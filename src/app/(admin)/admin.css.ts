import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '@/styles/tokens.css';

export const layoutContainer = style({
  display: 'grid',
  gridTemplateColumns: '240px 1fr',
  gap: vars.space[5],
  minHeight: '100vh',
  padding: `${vars.space[5]} ${vars.space[5]} ${vars.space[5]} ${vars.space[4]}`,
  backgroundColor: vars.color.adminCanvas,
  backgroundImage: `
    radial-gradient(ellipse 50% 40% at 100% 0%, rgba(36, 87, 255, 0.22), transparent),
    radial-gradient(ellipse 35% 30% at 0% 100%, rgba(214, 255, 58, 0.1), transparent)
  `,
  color: vars.color.adminText,
  fontFamily: vars.font.sans,
  boxSizing: 'border-box',
  '@media': {
    'screen and (max-width: 900px)': {
      gridTemplateColumns: '1fr',
      padding: vars.space[3],
      gap: vars.space[3],
    },
  },
});

export const sidebar = style({
  backgroundColor: vars.color.adminPanel,
  border: `1px solid ${vars.color.adminLine}`,
  borderRadius: vars.radius.lg,
  display: 'flex',
  flexDirection: 'column',
  padding: `${vars.space[5]} ${vars.space[4]}`,
  position: 'sticky',
  top: vars.space[5],
  height: `calc(100vh - ${vars.space[10]})`,
  boxShadow: vars.shadow.md,
  transform: 'rotate(0.35deg)',
  '@media': {
    'screen and (max-width: 900px)': {
      position: 'relative',
      height: 'auto',
      top: 0,
      transform: 'none',
    },
  },
});

export const brandSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  marginBottom: vars.space[5],
  paddingBottom: vars.space[4],
  position: 'relative',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: '45%',
      height: 3,
      backgroundColor: vars.color.adminSignal,
      transform: 'skewX(-14deg)',
      borderRadius: 2,
    },
  },
});

export const brandRow = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: vars.space[2],
});

export const brandTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.3rem',
  fontWeight: 800,
  letterSpacing: '-0.04em',
  color: vars.color.adminText,
  textDecoration: 'none',
});

export const adminBadge = style({
  fontSize: '0.58rem',
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: vars.color.signalInk,
  backgroundColor: vars.color.adminSignal,
  padding: '0.25rem 0.45rem',
  borderRadius: vars.radius.pill,
});

export const brandSubtitle = style({
  fontSize: '0.7rem',
  letterSpacing: '0.04em',
  color: vars.color.adminMuted,
  margin: 0,
});

export const separator = style({
  display: 'none',
});

export const navSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[1],
  flex: 1,
});

export const navSectionLabel = style({
  display: 'none',
});

export const navItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  padding: `${vars.space[3]} ${vars.space[3]}`,
  color: vars.color.adminMuted,
  textDecoration: 'none',
  fontSize: '0.78rem',
  fontWeight: 600,
  borderRadius: vars.radius.sm,
  transition: `color ${vars.motion.fast}, background-color ${vars.motion.fast}, transform ${vars.motion.fast}`,
  ':hover': {
    color: vars.color.adminText,
    backgroundColor: 'rgba(36, 87, 255, 0.15)',
    transform: 'translateX(4px)',
  },
});

export const navItemActive = style({
  color: vars.color.adminText,
  backgroundColor: vars.color.adminAccent,
});

export const sidebarFooter = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  marginTop: vars.space[5],
  paddingTop: vars.space[4],
  borderTop: `1px solid ${vars.color.adminLine}`,
});

export const adminProfileCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
});

export const adminAvatar = style({
  width: 36,
  height: 36,
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.adminAccent,
  color: vars.color.surface,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: vars.size.xs,
});

export const adminDetails = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
});

export const adminEmail = style({
  fontSize: vars.size.xs,
  color: vars.color.adminText,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const adminRole = style({
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: vars.color.adminMuted,
});

export const mainContent = style({
  padding: `${vars.space[2]} ${vars.space[2]} ${vars.space[8]}`,
  minWidth: 0,
});

export const header = style({
  marginBottom: vars.space[8],
  padding: `${vars.space[5]} ${vars.space[5]}`,
  backgroundColor: vars.color.adminPanel,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.adminLine}`,
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: '1.4fr 0.8fr',
  gap: vars.space[4],
  alignItems: 'end',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: vars.space[5],
      bottom: -3,
      width: '32%',
      height: 4,
      backgroundColor: vars.color.adminSignal,
      transform: 'skewX(-12deg)',
      borderRadius: 2,
    },
  },
  '@media': {
    'screen and (max-width: 720px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const headerTitle = style({
  margin: 0,
  fontFamily: vars.font.display,
  fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
  fontWeight: 800,
  letterSpacing: '-0.04em',
  color: vars.color.adminText,
  lineHeight: 0.95,
});

export const headerSubtitle = style({
  margin: 0,
  fontSize: vars.size.sm,
  color: vars.color.adminMuted,
  maxWidth: '28rem',
  textAlign: 'right',
  '@media': {
    'screen and (max-width: 720px)': {
      textAlign: 'left',
      paddingLeft: vars.space[5],
    },
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1.35fr 0.9fr 1.05fr 0.8fr',
  gap: vars.space[4],
  marginBottom: vars.space[8],
  '@media': {
    'screen and (max-width: 900px)': {
      gridTemplateColumns: '1fr 1fr',
    },
    'screen and (max-width: 560px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const metricCard = style({
  backgroundColor: vars.color.adminPanel,
  border: `1px solid ${vars.color.adminLine}`,
  borderRadius: vars.radius.md,
  padding: vars.space[4],
  boxShadow: vars.shadow.sm,
});

export const metricTopRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: vars.space[2],
});

export const metricLabel = style({
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: vars.color.adminMuted,
  borderLeft: `3px solid ${vars.color.adminSignal}`,
  paddingLeft: vars.space[2],
});

export const metricIconContainer = style({
  display: 'none',
});

export const metricValue = style({
  fontFamily: vars.font.display,
  fontSize: '1.75rem',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: vars.color.adminText,
});

export const metricSubtext = style({
  marginTop: vars.space[2],
  fontSize: '0.65rem',
  letterSpacing: '0.04em',
  color: vars.color.adminMuted,
});

export const sectionTitle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  margin: `${vars.space[8]} 0 ${vars.space[3]}`,
  fontFamily: vars.font.display,
  fontSize: vars.size.lg,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.adminText,
  paddingLeft: vars.space[3],
  borderLeft: `4px solid ${vars.color.adminSignal}`,
});

export const tableWrapper = style({
  border: `1px solid ${vars.color.adminLine}`,
  borderRadius: vars.radius.lg,
  overflow: 'auto',
  backgroundColor: vars.color.adminPanel,
  boxShadow: vars.shadow.sm,
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: vars.size.sm,
});

export const th = style({
  textAlign: 'left',
  padding: `${vars.space[3]} ${vars.space[4]}`,
  color: vars.color.adminMuted,
  fontWeight: 700,
  fontSize: '0.62rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${vars.color.adminLine}`,
  backgroundColor: 'rgba(36, 87, 255, 0.08)',
});

export const td = style({
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderBottom: `1px solid ${vars.color.adminLine}`,
  color: vars.color.adminText,
  verticalAlign: 'top',
});

export const tr = style({});

export const uuidCell = style({
  fontFamily: vars.font.mono,
  fontSize: vars.size.xs,
  color: vars.color.adminMuted,
});

export const statusBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.2rem 0.5rem',
  fontSize: '0.6rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderRadius: vars.radius.pill,
  border: `1px solid ${vars.color.adminLine}`,
});

export const statusPending = style({
  backgroundColor: 'transparent',
  color: vars.color.adminSignal,
  borderColor: vars.color.adminSignal,
});
export const statusProcessing = style({
  backgroundColor: vars.color.adminAccent,
  color: vars.color.surface,
  borderColor: vars.color.adminAccent,
});
export const statusShipped = style({
  backgroundColor: 'transparent',
  color: vars.color.adminText,
  borderStyle: 'dashed',
});
export const statusDelivered = style({
  backgroundColor: vars.color.adminSignal,
  color: vars.color.signalInk,
  borderColor: vars.color.adminSignal,
});
export const statusCancelled = style({
  backgroundColor: 'transparent',
  color: vars.color.adminMuted,
});

export const emptyState = style({
  padding: `${vars.space[8]} ${vars.space[5]}`,
  color: vars.color.adminMuted,
  border: `1px solid ${vars.color.adminLine}`,
  borderRadius: vars.radius.lg,
  borderLeft: `4px solid ${vars.color.adminSignal}`,
  backgroundColor: vars.color.adminPanel,
});

export const approvalSection = style({
  marginTop: vars.space[6],
});

export const actionButtonGroup = style({
  display: 'flex',
  gap: vars.space[2],
  flexWrap: 'wrap',
});

export const approveBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: `0 ${vars.space[3]}`,
  border: `1.5px solid ${vars.color.adminAccent}`,
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.adminAccent,
  color: vars.color.surface,
  fontWeight: 700,
  fontSize: '0.7rem',
  cursor: 'pointer',
  transition: `transform ${vars.motion.fast}`,
  selectors: {
    '&:hover': { transform: 'translateY(-1px)' },
  },
});

export const rejectBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: `0 ${vars.space[3]}`,
  border: `1.5px solid ${vars.color.adminLine}`,
  borderRadius: vars.radius.sm,
  backgroundColor: 'transparent',
  color: vars.color.adminText,
  fontWeight: 700,
  fontSize: '0.7rem',
  cursor: 'pointer',
});

export const specCountChip = style({
  display: 'inline-flex',
  fontSize: vars.size.xs,
  color: vars.color.adminMuted,
});

export const queueBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: 24,
  padding: `0 ${vars.space[2]}`,
  borderRadius: vars.radius.pill,
  backgroundColor: vars.color.adminSignal,
  color: vars.color.signalInk,
  fontSize: '0.62rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export const queueSuccessToast = style({
  border: `1px solid ${vars.color.success}`,
  borderLeftWidth: 4,
  borderRadius: vars.radius.sm,
  color: vars.color.successSoft,
  backgroundColor: 'rgba(15, 122, 76, 0.2)',
  padding: vars.space[3],
  marginBottom: vars.space[4],
  fontSize: vars.size.sm,
});

globalStyle(`${metricCard}:nth-child(2)`, {
  '@media': {
    'screen and (min-width: 901px)': { transform: 'translateY(14px)' },
  },
});
globalStyle(`${metricCard}:nth-child(3)`, {
  '@media': {
    'screen and (min-width: 901px)': { transform: 'translateY(-8px)' },
  },
});
globalStyle(`${metricCard}:nth-child(4)`, {
  '@media': {
    'screen and (min-width: 901px)': { transform: 'translateY(8px)' },
  },
});
