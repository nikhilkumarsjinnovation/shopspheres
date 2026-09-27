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
}: {
  value: PersonaConfig['id'];
  onChange: (persona: PersonaConfig['id']) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.35rem',
        padding: '0.65rem 1rem',
        overflowX: 'auto',
        background: 'var(--bg-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
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
