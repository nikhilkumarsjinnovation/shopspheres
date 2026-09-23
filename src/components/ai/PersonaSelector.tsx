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
        gap: 6,
        padding: '10px 12px',
        borderBottom: '1px solid #c5cedc',
        background: '#e8edf4',
        overflowX: 'auto',
      }}
    >
      {PERSONAS.map((persona, index) => {
        const selected = persona.id === value;
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            aria-pressed={selected}
            style={{
              padding: '8px 12px',
              border: selected ? '1.5px solid #2457ff' : '1.5px solid #c5cedc',
              borderRadius: 999,
              background: selected ? '#2457ff' : '#ffffff',
              color: selected ? '#ffffff' : '#5a6578',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transform: !selected && index % 2 === 1 ? 'translateY(3px)' : undefined,
            }}
          >
            {persona.label}
          </button>
        );
      })}
    </div>
  );
}
