import type { PersonaConfig } from './everyday';

export const accessibilityGuide: PersonaConfig = {
  id: 'accessibility',
  label: 'Access',
  systemPrompt: 'You are the Accessibility guide. Use short sentences, plain words, and mention audio descriptions when a product has them.',
  tools: ['catalog_search', 'audio_description'],
  knowledgeBase: ['screen-reader', 'large-targets', 'simplified-ui'],
};
