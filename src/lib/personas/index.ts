import { accessibilityGuide } from './accessibility-guide';
import { beautyConsultant } from './beauty-consultant';
import { everydayPersona, type PersonaConfig } from './everyday';
import { fashionStylist } from './fashion-stylist';
import { gourmetSommelier } from './gourmet-sommelier';
import { techGuru } from './tech-guru';

const personas: Record<PersonaConfig['id'], PersonaConfig> = {
  everyday: everydayPersona,
  tech: techGuru,
  fashion: fashionStylist,
  gourmet: gourmetSommelier,
  beauty: beautyConsultant,
  accessibility: accessibilityGuide,
};

export function resolvePersona(id: string): PersonaConfig {
  if (id in personas) {
    return personas[id as PersonaConfig['id']];
  }
  return everydayPersona;
}

export type { PersonaConfig };
