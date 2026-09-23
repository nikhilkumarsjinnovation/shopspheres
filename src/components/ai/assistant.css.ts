import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/tokens.css';

export const trigger = style({
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 20px',
  borderRadius: vars.radius.md,
  backgroundColor: vars.color.accent,
  color: vars.color.surface,
  border: `1.5px solid ${vars.color.accent}`,
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '0.8rem',
  letterSpacing: '0.02em',
  fontFamily: vars.font.sans,
  boxShadow: '0 8px 24px rgba(36, 87, 255, 0.35)',
  transition: `transform ${vars.motion.fast}, box-shadow ${vars.motion.fast}`,
  selectors: {
    '&:hover': {
      transform: 'translateY(-3px) rotate(-1deg)',
      boxShadow: '0 12px 28px rgba(36, 87, 255, 0.4)',
    },
  },
});

export const panel = style({
  position: 'fixed',
  top: 16,
  right: 16,
  bottom: 16,
  zIndex: 50,
  width: 'min(100vw - 24px, 420px)',
  height: 'auto',
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.line}`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: vars.shadow.md,
  transform: 'rotate(0.3deg)',
  '@media': {
    'screen and (max-width: 520px)': {
      inset: 8,
      width: 'auto',
      transform: 'none',
    },
  },
});

export const header = style({
  padding: '18px 20px',
  backgroundColor: vars.color.ink,
  color: vars.color.surface,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space[3],
  position: 'relative',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 20,
      bottom: -2,
      width: '36%',
      height: 3,
      backgroundColor: vars.color.signal,
      transform: 'skewX(-14deg)',
      borderRadius: 2,
    },
  },
});

export const messages = style({
  flex: 1,
  overflowY: 'auto',
  padding: '20px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  backgroundColor: vars.color.canvas,
  backgroundImage: `
    radial-gradient(ellipse 60% 40% at 100% 0%, rgba(36, 87, 255, 0.1), transparent),
    radial-gradient(ellipse 40% 30% at 0% 100%, rgba(214, 255, 58, 0.12), transparent)
  `,
});

export const bubbleUser = style({
  padding: '11px 14px',
  borderRadius: `${vars.radius.md} ${vars.radius.md} 4px ${vars.radius.md}`,
  backgroundColor: vars.color.accent,
  border: `1.5px solid ${vars.color.accent}`,
  color: vars.color.surface,
  fontSize: 13,
  lineHeight: 1.5,
  boxShadow: '0 4px 12px rgba(36, 87, 255, 0.2)',
});

export const bubbleAssistant = style({
  padding: '11px 14px',
  borderRadius: `${vars.radius.md} ${vars.radius.md} ${vars.radius.md} 4px`,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.line}`,
  borderLeft: `4px solid ${vars.color.signal}`,
  color: vars.color.ink,
  fontSize: 13,
  lineHeight: 1.5,
  boxShadow: vars.shadow.sm,
});

export const suggestionRow = style({
  padding: '10px 14px',
  backgroundColor: vars.color.surface,
  borderTop: `1px solid ${vars.color.line}`,
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
});

export const suggestionPill = style({
  whiteSpace: 'nowrap',
  fontSize: 11,
  padding: '7px 12px',
  borderRadius: vars.radius.pill,
  backgroundColor: vars.color.accentSoft,
  color: vars.color.accent,
  border: `1.5px solid ${vars.color.accentSoft}`,
  cursor: 'pointer',
  fontWeight: 700,
  transition: `transform ${vars.motion.fast}, background-color ${vars.motion.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.color.accent,
      color: vars.color.surface,
      transform: 'translateY(-2px)',
    },
  },
});

export const composer = style({
  padding: 14,
  backgroundColor: vars.color.surface,
  borderTop: `1px solid ${vars.color.line}`,
  display: 'flex',
  gap: 8,
});

export const composerInput = style({
  flex: 1,
  padding: '11px 14px',
  borderRadius: vars.radius.sm,
  border: `1.5px solid ${vars.color.lineStrong}`,
  fontSize: 13,
  outline: 'none',
  backgroundColor: vars.color.canvas,
  color: vars.color.ink,
  selectors: {
    '&:focus': {
      borderColor: vars.color.accent,
      boxShadow: `0 0 0 3px ${vars.color.accentSoft}`,
    },
  },
});

export const sendBtn = style({
  padding: '11px 16px',
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.accent,
  color: vars.color.surface,
  border: `1.5px solid ${vars.color.accent}`,
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  selectors: {
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
});
