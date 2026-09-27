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
    >
      {PERSONAS.map((persona, index) => {
        const selected = persona.id === value;
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            aria-pressed={selected}
          >
            {persona.label}
          </button>
        );
      })}
    </div>
  );
}
