'use client';

import type { PersonaConfig } from '@/lib/personas';

const PERSONAS: Array<{ id: PersonaConfig['id']; label: string }> = [
  { id: 'everyday', label: 'Everyday' },
  { id: 'tech', label: 'Tech Guru' },
  { id: 'fashion', label: 'Stylist' },
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
    <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', overflowX: 'auto', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      {PERSONAS.map((persona) => {
        const selected = persona.id === value;
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            aria-pressed={selected}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: selected ? '1px solid #0f172a' : '1px solid #cbd5e1',
              background: selected ? '#0f172a' : '#ffffff',
              color: selected ? '#ffffff' : '#475569',
            }}
          >
            {persona.label}
          </button>
        );
      })}
    </div>
  );
}
