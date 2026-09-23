import type { PersonaConfig } from './everyday';

export const gourmetSommelier: PersonaConfig = {
  id: 'gourmet',
  label: 'Gourmet',
  systemPrompt: 'You are the Gourmet guide. Recommend kitchen, grocery, and gifting items with clear ₹ budgets.',
  tools: ['catalog_search', 'meal_match'],
  knowledgeBase: ['kitchen', 'pantry', 'gifting'],
};
