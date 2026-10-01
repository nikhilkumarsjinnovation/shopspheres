'use client';

import type { PersonaConfig } from '@/lib/personas';

const PERSONAS: Array<{ id: PersonaConfig['id']; label: string }> = [
  { id: 'everyday', label: 'Everyday' },
  { id: 'tech', label: 'Tech' },
  { id: 'fashion', label: 'Style' },
  { id: 'gourmet', label: 'Gourmet' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'accessibility', label: 'Access' },
];

export default function PersonaSelector({
  value,
  onChange,
  variant = 'bar',
}: {
  value: PersonaConfig['id'];
  onChange: (persona: PersonaConfig['id']) => void;
  variant?: 'bar' | 'wrap';
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: variant === 'wrap' ? 'wrap' : 'nowrap',
        gap: '0.35rem',
        padding: variant === 'wrap' ? 0 : '0.65rem 1rem',
        overflowX: variant === 'wrap' ? 'visible' : 'auto',
        background: variant === 'wrap' ? 'transparent' : 'var(--bg-subtle)',
        borderBottom: variant === 'wrap' ? 'none' : '1px solid var(--border-subtle)',
        scrollbarWidth: 'none',
      }}
    >
      {PERSONAS.map((persona) => {
        const selected = persona.id === value;
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            aria-pressed={selected}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: selected ? 700 : 500,
              background: selected ? 'var(--fg-primary)' : 'var(--bg-surface)',
              color: selected ? 'var(--fg-inverted)' : 'var(--fg-secondary)',
              border: `1px solid ${selected ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selected ? 'var(--shadow-xs)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            {persona.label}
          </button>
        );
      })}
    </div>
  );
}
