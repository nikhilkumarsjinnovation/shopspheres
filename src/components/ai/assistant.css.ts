import { style } from '@vanilla-extract/css';

export const trigger = style({
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  borderRadius: '9999px',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: '1px solid #334155',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
});

export const panel = style({
  position: 'fixed',
  bottom: '84px',
  right: '24px',
  zIndex: 50,
  width: 'min(92vw, 420px)',
  height: 'min(80vh, 620px)',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const header = style({
  padding: '14px 18px',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const messages = style({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  backgroundColor: '#fdfdfe',
});
