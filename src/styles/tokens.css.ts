import { createGlobalTheme, globalStyle } from '@vanilla-extract/css';

/** Cool mist + cobalt + lime — asymmetrical high-contrast system. */
export const vars = createGlobalTheme(':root', {
  color: {
    ink: '#07101f',
    inkMuted: '#5a6578',
    inkSubtle: '#7a8699',
    surface: '#ffffff',
    canvas: '#e8edf4',
    line: '#c5cedc',
    lineStrong: '#9aabbf',
    accent: '#2457ff',
    accentHover: '#1a45d4',
    accentSoft: '#dce6ff',
    accentText: '#07101f',
    signal: '#d6ff3a',
    signalInk: '#07101f',
    danger: '#c41e3a',
    dangerSoft: '#ffe0e6',
    warn: '#b45309',
    warnSoft: '#ffedd5',
    success: '#0f7a4c',
    successSoft: '#d8f5e8',
    adminCanvas: '#07101f',
    adminPanel: '#121a2a',
    adminLine: '#243048',
    adminText: '#eef2f8',
    adminMuted: '#8a96ab',
    adminAccent: '#2457ff',
    adminSignal: '#d6ff3a',
  },
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '24px',
    6: '32px',
    8: '48px',
    10: '64px',
    12: '80px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    pill: '999px',
  },
  font: {
    sans: 'var(--font-body), "Segoe UI", sans-serif',
    display: 'var(--font-display), "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  size: {
    xs: '0.7rem',
    sm: '0.85rem',
    md: '1rem',
    lg: '1.2rem',
    xl: '1.75rem',
    xxl: '2.5rem',
  },
  shadow: {
    sm: '0 4px 16px rgba(7, 16, 31, 0.08)',
    md: '0 12px 32px rgba(7, 16, 31, 0.12)',
  },
  motion: {
    fast: '140ms cubic-bezier(0.22, 1, 0.36, 1)',
    base: '220ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
});

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
});

globalStyle('html, body', {
  margin: 0,
  padding: 0,
  minHeight: '100%',
  backgroundColor: vars.color.canvas,
  color: vars.color.ink,
  fontFamily: vars.font.sans,
  fontSize: '16px',
  lineHeight: 1.55,
  WebkitFontSmoothing: 'antialiased',
});

globalStyle('a', {
  color: 'inherit',
});

globalStyle('button, input, select, textarea', {
  fontFamily: 'inherit',
  borderRadius: vars.radius.sm,
});

globalStyle('img', {
  maxWidth: '100%',
  display: 'block',
});

globalStyle('h1, h2, h3', {
  fontFamily: vars.font.display,
  letterSpacing: '-0.03em',
  fontWeight: 700,
});
