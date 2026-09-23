export interface PersonaConfig {
  id: 'everyday' | 'tech' | 'fashion' | 'gourmet' | 'beauty' | 'accessibility';
  label: string;
  systemPrompt: string;
  tools: string[];
  knowledgeBase: string[];
}

export const everydayPersona: PersonaConfig = {
  id: 'everyday',
  label: 'Everyday',
  systemPrompt: 'You are the everyday ShopSphere guide. Prioritize value, delivery speed, and festival usefulness in ₹.',
  tools: ['catalog_search', 'feed_update'],
  knowledgeBase: ['indian-retail', 'festivals', 'upi-offers'],
};
