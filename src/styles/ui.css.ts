import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@/styles/tokens.css';

export const buttonBase = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space[2],
  borderRadius: vars.radius.sm,
  border: `1.5px solid ${vars.color.accent}`,
  fontWeight: 700,
  fontSize: vars.size.sm,
  letterSpacing: '0.02em',
  lineHeight: 1,
  cursor: 'pointer',
  transition: `transform ${vars.motion.fast}, background-color ${vars.motion.fast}, box-shadow ${vars.motion.fast}`,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  selectors: {
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.color.accent}`,
      outlineOffset: 3,
    },
  },
});

export const buttonSize = styleVariants({
  sm: { height: 34, padding: `0 ${vars.space[3]}` },
  md: { height: 44, padding: `0 ${vars.space[5]}` },
  icon: { width: 44, height: 44, padding: 0 },
});

export const buttonTone = styleVariants({
  primary: {
    backgroundColor: vars.color.accent,
    color: vars.color.surface,
    borderColor: vars.color.accent,
    selectors: {
      '&:hover:not(:disabled)': {
        backgroundColor: vars.color.accentHover,
        transform: 'translateY(-2px)',
        boxShadow: vars.shadow.sm,
      },
    },
  },
  secondary: {
    backgroundColor: vars.color.surface,
    color: vars.color.ink,
    borderColor: vars.color.lineStrong,
    selectors: {
      '&:hover:not(:disabled)': {
        borderColor: vars.color.accent,
        backgroundColor: vars.color.accentSoft,
        transform: 'translateY(-1px)',
      },
    },
  },
  ghost: {
    backgroundColor: 'transparent',
    color: vars.color.ink,
    borderColor: 'transparent',
    selectors: {
      '&:hover:not(:disabled)': { backgroundColor: vars.color.accentSoft },
    },
  },
  danger: {
    backgroundColor: vars.color.surface,
    color: vars.color.danger,
    borderColor: vars.color.danger,
    selectors: {
      '&:hover:not(:disabled)': {
        backgroundColor: vars.color.danger,
        color: vars.color.surface,
      },
    },
  },
});

export const badge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 24,
  padding: `0 ${vars.space[2]}`,
  borderRadius: vars.radius.pill,
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  lineHeight: 1,
  border: `1px solid transparent`,
});

export const badgeTone = styleVariants({
  neutral: {
    backgroundColor: vars.color.canvas,
    color: vars.color.inkMuted,
    borderColor: vars.color.line,
  },
  accent: {
    backgroundColor: vars.color.signal,
    color: vars.color.signalInk,
    borderColor: vars.color.signal,
  },
  success: {
    backgroundColor: vars.color.successSoft,
    color: vars.color.success,
    borderColor: vars.color.successSoft,
  },
  warn: {
    backgroundColor: vars.color.warnSoft,
    color: vars.color.warn,
    borderColor: vars.color.warnSoft,
  },
  danger: {
    backgroundColor: vars.color.dangerSoft,
    color: vars.color.danger,
    borderColor: vars.color.dangerSoft,
  },
});

export const pageHeader = style({
  marginBottom: vars.space[8],
  paddingBottom: vars.space[5],
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.8fr)',
  gap: vars.space[5],
  alignItems: 'end',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: '42%',
      height: 4,
      backgroundColor: vars.color.signal,
      transform: 'skewX(-12deg)',
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

export const pageTitle = style({
  margin: 0,
  fontFamily: vars.font.display,
  fontSize: 'clamp(2rem, 5vw, 3.2rem)',
  fontWeight: 800,
  letterSpacing: '-0.04em',
  color: vars.color.ink,
  lineHeight: 0.95,
});

export const pageSubtitle = style({
  margin: 0,
  fontSize: vars.size.sm,
  color: vars.color.inkMuted,
  maxWidth: '28rem',
  marginLeft: 'auto',
  textAlign: 'right',
  '@media': {
    'screen and (max-width: 720px)': {
      marginLeft: 0,
      textAlign: 'left',
      paddingLeft: vars.space[6],
    },
  },
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: vars.space[3],
  padding: `${vars.space[8]} ${vars.space[5]}`,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.sm,
  border: `1px solid ${vars.color.line}`,
  borderLeft: `4px solid ${vars.color.signal}`,
  color: vars.color.inkMuted,
});
