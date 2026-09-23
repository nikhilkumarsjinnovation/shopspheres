import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '@/styles/tokens.css';

export const layout = style({
  minHeight: '100vh',
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  backgroundColor: vars.color.canvas,
  color: vars.color.ink,
  fontFamily: vars.font.sans,
  backgroundImage: `
    radial-gradient(ellipse 80% 50% at 100% -10%, rgba(36, 87, 255, 0.12), transparent),
    radial-gradient(ellipse 40% 30% at 0% 100%, rgba(214, 255, 58, 0.18), transparent)
  `,
});

export const navbar = style({
  position: 'sticky',
  top: 0,
  zIndex: 40,
  display: 'grid',
  gridTemplateColumns: 'minmax(160px, 1.2fr) minmax(0, 2fr) auto',
  alignItems: 'center',
  gap: vars.space[4],
  padding: `${vars.space[3]} ${vars.space[5]} ${vars.space[3]} ${vars.space[8]}`,
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  backdropFilter: 'blur(12px)',
  borderBottom: `1px solid ${vars.color.line}`,
  boxShadow: vars.shadow.sm,
  '@media': {
    'screen and (max-width: 900px)': {
      gridTemplateColumns: '1fr auto',
      padding: `${vars.space[3]} ${vars.space[4]}`,
    },
  },
});

export const navLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  minWidth: 0,
  transform: 'translateX(-4px)',
});

export const brandTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.55rem',
  fontWeight: 800,
  letterSpacing: '-0.05em',
  color: vars.color.ink,
  textDecoration: 'none',
  position: 'relative',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: -6,
      bottom: -2,
      width: '70%',
      height: 3,
      backgroundColor: vars.color.signal,
      transform: 'skewX(-18deg)',
      borderRadius: 2,
    },
  },
});

export const brandBadge = style({
  display: 'none',
});

export const navLinks = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: vars.space[4],
  paddingLeft: vars.space[4],
  borderLeft: `3px solid ${vars.color.signal}`,
  '@media': {
    'screen and (max-width: 900px)': {
      display: 'none',
    },
  },
});

export const navLink = style({
  color: vars.color.inkMuted,
  textDecoration: 'none',
  fontSize: '0.8rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  padding: `${vars.space[1]} 0`,
  borderBottom: '2px solid transparent',
  transition: `color ${vars.motion.fast}, border-color ${vars.motion.fast}, transform ${vars.motion.fast}`,
  ':hover': {
    color: vars.color.accent,
    transform: 'translateY(-1px)',
  },
});

export const navLinkActive = style({
  color: vars.color.accent,
  borderBottomColor: vars.color.accent,
});

export const navRight = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: vars.space[2],
  paddingRight: vars.space[2],
});

export const cartLink = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
  height: 42,
  padding: `0 ${vars.space[4]}`,
  border: `1.5px solid ${vars.color.accent}`,
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.accent,
  color: vars.color.surface,
  textDecoration: 'none',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  transition: `transform ${vars.motion.fast}, box-shadow ${vars.motion.fast}`,
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: vars.shadow.sm,
  },
});

export const cartBadge = style({
  position: 'absolute',
  top: -8,
  right: -8,
  backgroundColor: vars.color.signal,
  color: vars.color.signalInk,
  fontSize: '0.65rem',
  fontWeight: 800,
  minWidth: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: vars.radius.pill,
  border: `2px solid ${vars.color.surface}`,
});

export const mainContent = style({
  width: '100%',
  maxWidth: '1320px',
  margin: '0 auto',
  padding: `${vars.space[8]} ${vars.space[5]} ${vars.space[12]} ${vars.space[8]}`,
  '@media': {
    'screen and (max-width: 640px)': {
      padding: `${vars.space[5]} ${vars.space[4]} ${vars.space[8]}`,
    },
  },
});

export const headerContainer = style({
  marginBottom: vars.space[8],
  paddingBottom: vars.space[5],
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 0.85fr)',
  gap: vars.space[5],
  alignItems: 'end',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: '38%',
      height: 4,
      backgroundColor: vars.color.signal,
      transform: 'skewX(-14deg)',
      borderRadius: 2,
    },
  },
  '@media': {
    'screen and (max-width: 720px)': {
      gridTemplateColumns: '1fr',
      gap: vars.space[2],
    },
  },
});

export const heading = style({
  fontFamily: vars.font.display,
  fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)',
  fontWeight: 800,
  letterSpacing: '-0.045em',
  color: vars.color.ink,
  margin: 0,
  lineHeight: 0.92,
});

export const subheading = style({
  fontSize: vars.size.sm,
  color: vars.color.inkMuted,
  margin: 0,
  maxWidth: '26rem',
  marginLeft: 'auto',
  textAlign: 'right',
  paddingBottom: vars.space[1],
  '@media': {
    'screen and (max-width: 720px)': {
      marginLeft: vars.space[6],
      textAlign: 'left',
    },
  },
});

export const productGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: vars.space[5],
  alignItems: 'start',
});

export const productCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.line}`,
  borderRadius: vars.radius.md,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: vars.shadow.sm,
  transition: `transform ${vars.motion.base}, box-shadow ${vars.motion.base}`,
  ':hover': {
    transform: 'translateY(-6px) rotate(-0.4deg)',
    boxShadow: vars.shadow.md,
  },
});

export const cardImageContainer = style({
  width: '100%',
  aspectRatio: '4 / 5',
  backgroundColor: vars.color.canvas,
  overflow: 'hidden',
  position: 'relative',
});

export const cardImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: `transform ${vars.motion.base}`,
  selectors: {
    [`${productCard}:hover &`]: {
      transform: 'scale(1.04)',
    },
  },
});

export const cardPlaceholderImage = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[2],
  color: vars.color.inkSubtle,
  fontSize: vars.size.xs,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  backgroundColor: vars.color.canvas,
});

export const cardBody = style({
  padding: `${vars.space[3]} ${vars.space[4]} ${vars.space[4]}`,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  flex: 1,
});

export const cardCategory = style({
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: vars.color.accent,
  letterSpacing: '0.08em',
  alignSelf: 'flex-start',
  paddingLeft: vars.space[1],
  borderLeft: `3px solid ${vars.color.signal}`,
});

export const cardTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.05rem',
  fontWeight: 700,
  color: vars.color.ink,
  margin: 0,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const cardDescription = style({
  display: 'none',
});

export const cardFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  marginTop: 'auto',
  paddingTop: vars.space[2],
});

export const cardPrice = style({
  fontSize: vars.size.md,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.ink,
  fontVariantNumeric: 'tabular-nums',
});

export const buttonAddToCart = style({
  backgroundColor: vars.color.accent,
  color: vars.color.surface,
  border: `1.5px solid ${vars.color.accent}`,
  borderRadius: vars.radius.sm,
  height: 36,
  padding: `0 ${vars.space[3]}`,
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
  transition: `transform ${vars.motion.fast}, background-color ${vars.motion.fast}`,
  ':hover': {
    backgroundColor: vars.color.accentHover,
    transform: 'translateY(-1px)',
  },
  ':disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
});

export const qtyControl = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0,
  border: `1.5px solid ${vars.color.lineStrong}`,
  borderRadius: vars.radius.sm,
  height: 36,
  backgroundColor: vars.color.surface,
  overflow: 'hidden',
});

export const qtyButton = style({
  width: 32,
  height: '100%',
  border: 'none',
  background: 'transparent',
  color: vars.color.ink,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  ':hover': {
    backgroundColor: vars.color.accentSoft,
  },
});

export const checkoutLayout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.75fr)',
  gap: vars.space[6],
  alignItems: 'start',
  '@media': {
    'screen and (max-width: 860px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const checkoutSection = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.line}`,
  borderRadius: vars.radius.lg,
  padding: vars.space[5],
  marginBottom: vars.space[5],
  boxShadow: vars.shadow.sm,
  position: 'relative',
  selectors: {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 16,
      left: -3,
      width: 4,
      height: 48,
      backgroundColor: vars.color.signal,
      borderRadius: 2,
      transform: 'skewY(-8deg)',
    },
  },
});

export const sectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: vars.size.lg,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.ink,
  margin: `0 0 ${vars.space[4]} 0`,
  paddingBottom: vars.space[3],
  borderBottom: `1px solid ${vars.color.line}`,
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1.1fr 0.9fr',
  gap: vars.space[4],
  marginBottom: vars.space[4],
  '@media': {
    'screen and (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  marginBottom: vars.space[4],
});

export const label = style({
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: vars.color.inkMuted,
});

export const input = style({
  padding: `${vars.space[3]} ${vars.space[3]}`,
  fontSize: vars.size.md,
  border: `1.5px solid ${vars.color.lineStrong}`,
  borderRadius: vars.radius.sm,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: vars.color.surface,
  transition: `border-color ${vars.motion.fast}, box-shadow ${vars.motion.fast}`,
  ':focus': {
    borderColor: vars.color.accent,
    boxShadow: `0 0 0 3px ${vars.color.accentSoft}`,
  },
});

export const giftToggleContainer = style({
  backgroundColor: vars.color.accentSoft,
  border: `1px solid ${vars.color.line}`,
  borderRadius: vars.radius.md,
  padding: vars.space[4],
  marginBottom: vars.space[4],
  transform: 'rotate(-0.3deg)',
});

export const giftCheckboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space[3],
  cursor: 'pointer',
  fontSize: vars.size.sm,
  fontWeight: 700,
  color: vars.color.ink,
  userSelect: 'none',
});

export const giftFieldsContainer = style({
  marginTop: vars.space[4],
  paddingTop: vars.space[4],
  borderTop: `1px dashed ${vars.color.lineStrong}`,
});

export const giftNotice = style({
  fontSize: vars.size.sm,
  color: vars.color.inkSubtle,
  marginTop: vars.space[2],
});

export const summaryCard = style({
  backgroundColor: vars.color.surface,
  color: vars.color.ink,
  padding: vars.space[5],
  position: 'sticky',
  top: 88,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.md,
  border: `1px solid ${vars.color.line}`,
  transform: 'translateY(12px)',
  selectors: {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 20,
      left: -3,
      width: 4,
      height: 56,
      backgroundColor: vars.color.signal,
      borderRadius: 2,
      transform: 'skewY(-8deg)',
    },
  },
  '@media': {
    'screen and (max-width: 860px)': {
      transform: 'none',
      position: 'relative',
      top: 0,
    },
  },
});

export const summaryItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: vars.size.sm,
  color: vars.color.inkMuted,
  marginBottom: vars.space[3],
});

export const summaryTotal = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: vars.font.display,
  fontSize: vars.size.lg,
  fontWeight: 800,
  color: vars.color.ink,
  paddingTop: vars.space[3],
  borderTop: `1px solid ${vars.color.line}`,
  marginTop: vars.space[4],
  marginBottom: vars.space[5],
});

export const cartItemList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  marginBottom: vars.space[4],
});

export const cartRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: vars.space[3],
  fontSize: vars.size.sm,
  padding: vars.space[3],
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.line}`,
  backgroundColor: vars.color.canvas,
  color: vars.color.ink,
});

export const buttonCheckout = style({
  width: '100%',
  backgroundColor: vars.color.accent,
  color: vars.color.surface,
  border: `1.5px solid ${vars.color.accent}`,
  borderRadius: vars.radius.sm,
  padding: vars.space[3],
  fontSize: '0.9rem',
  fontWeight: 800,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: `transform ${vars.motion.fast}, box-shadow ${vars.motion.fast}`,
  boxShadow: '0 4px 14px rgba(36, 87, 255, 0.28)',
  ':hover': {
    transform: 'translateY(-2px)',
    backgroundColor: vars.color.accentHover,
  },
  ':disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
});

export const alertSuccess = style({
  backgroundColor: vars.color.successSoft,
  border: `1px solid ${vars.color.success}`,
  borderLeftWidth: 4,
  borderRadius: vars.radius.sm,
  color: vars.color.success,
  padding: vars.space[4],
  marginBottom: vars.space[5],
  fontSize: vars.size.sm,
});

export const alertError = style({
  backgroundColor: vars.color.dangerSoft,
  border: `1px solid ${vars.color.danger}`,
  borderLeftWidth: 4,
  borderRadius: vars.radius.sm,
  color: vars.color.danger,
  padding: vars.space[4],
  marginBottom: vars.space[5],
  fontSize: vars.size.sm,
});

export const emptyState = style({
  textAlign: 'left',
  padding: `${vars.space[8]} ${vars.space[5]}`,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.line}`,
  borderLeft: `4px solid ${vars.color.signal}`,
  color: vars.color.inkMuted,
  boxShadow: vars.shadow.sm,
});

export const iconButton = style({
  width: 42,
  height: 42,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1.5px solid ${vars.color.lineStrong}`,
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.surface,
  color: vars.color.ink,
  cursor: 'pointer',
  position: 'relative',
  transition: `background-color ${vars.motion.fast}, border-color ${vars.motion.fast}`,
  ':hover': {
    backgroundColor: vars.color.accentSoft,
    borderColor: vars.color.accent,
  },
});

export const deliverHint = style({
  display: 'none',
});

export const surfaceCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.line}`,
  borderRadius: vars.radius.lg,
  padding: vars.space[5],
  boxShadow: vars.shadow.sm,
});

export const stack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[4],
});

export const sectionBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[3],
  marginBottom: vars.space[8],
});

export const sectionLabel = style({
  margin: 0,
  fontFamily: vars.font.display,
  fontSize: vars.size.lg,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: vars.color.ink,
  paddingLeft: vars.space[3],
  borderLeft: `4px solid ${vars.color.signal}`,
});

export const listCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.line}`,
  borderRadius: vars.radius.md,
  padding: vars.space[4],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space[2],
  boxShadow: vars.shadow.sm,
});

export const listMeta = style({
  fontSize: vars.size.sm,
  color: vars.color.inkSubtle,
  margin: 0,
});

export const inlineActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.space[2],
  alignItems: 'center',
});

export const buttonSecondary = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space[2],
  height: 36,
  padding: `0 ${vars.space[3]}`,
  border: `1.5px solid ${vars.color.lineStrong}`,
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.surface,
  color: vars.color.ink,
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: `border-color ${vars.motion.fast}, background-color ${vars.motion.fast}`,
  ':hover': {
    borderColor: vars.color.accent,
    backgroundColor: vars.color.accentSoft,
  },
});

export const quietLink = style({
  color: vars.color.accent,
  fontWeight: 700,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  fontSize: vars.size.sm,
  ':hover': {
    color: vars.color.accentHover,
  },
});

export const shopGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.space[5],
});

export const exploreControls = style({
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.line}`,
  padding: `${vars.space[5]} ${vars.space[5]}`,
  boxShadow: vars.shadow.sm,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(160px, 0.45fr)',
  gap: vars.space[4],
  alignItems: 'stretch',
  position: 'relative',
  '@media': {
    'screen and (max-width: 720px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const exploreAiBtn = style({
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.accent,
  color: vars.color.surface,
  border: `1.5px solid ${vars.color.accent}`,
  fontWeight: 700,
  fontSize: vars.size.sm,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[2],
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(36, 87, 255, 0.28)',
  '@media': {
    'screen and (min-width: 721px)': {
      transform: 'translateY(4px)',
    },
  },
});

globalStyle(`${productGrid} > *:nth-child(3n+2)`, {
  '@media': {
    'screen and (min-width: 901px)': {
      transform: 'translateY(18px)',
    },
  },
});

globalStyle(`${productGrid} > *:nth-child(3n)`, {
  '@media': {
    'screen and (min-width: 901px)': {
      transform: 'translateY(-10px)',
    },
  },
});

globalStyle(`${listCard}:nth-child(even)`, {
  '@media': {
    'screen and (min-width: 641px)': {
      transform: 'translateX(12px)',
    },
  },
});

globalStyle(`${shopGrid} > *:nth-child(odd)`, {
  '@media': {
    'screen and (min-width: 901px)': {
      transform: 'translateY(10px)',
    },
  },
});
