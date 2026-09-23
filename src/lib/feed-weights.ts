import type { Json } from '@/types/database.types';

export type FeedWeights = {
  category_weights: Record<string, number>;
  recent_chat_intents: string[];
  boosted_keywords: string[];
  last_updated?: number;
};

function readStringList(value: Json | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseFeedWeights(value: Json | null | undefined): FeedWeights {
  const empty: FeedWeights = {
    category_weights: {},
    recent_chat_intents: [],
    boosted_keywords: [],
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return empty;
  }

  const categoryWeights: Record<string, number> = {};
  const rawWeights = value.category_weights;
  if (rawWeights && typeof rawWeights === 'object' && !Array.isArray(rawWeights)) {
    for (const [key, weight] of Object.entries(rawWeights)) {
      if (typeof weight === 'number') {
        categoryWeights[key] = weight;
      }
    }
  }

  const lastUpdated = value.last_updated;
  return {
    category_weights: categoryWeights,
    recent_chat_intents: readStringList(value.recent_chat_intents),
    boosted_keywords: readStringList(value.boosted_keywords),
    last_updated: typeof lastUpdated === 'number' ? lastUpdated : undefined,
  };
}

export function feedWeightsToJson(weights: FeedWeights): Json {
  return {
    category_weights: weights.category_weights,
    recent_chat_intents: weights.recent_chat_intents,
    boosted_keywords: weights.boosted_keywords,
    last_updated: weights.last_updated ?? null,
  };
}
