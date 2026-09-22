import { z } from 'zod';

/**
 * CategoryResponseSchema
 * Upgraded for Enterprise Master E-commerce Data Entry Agent.
 * Includes Amazon-level attributes record and suggested retail price.
 */
export const CategoryResponseSchema = z.object({
  category: z.string().min(1),
  sub_category: z.string().min(1),
  tags: z.array(z.string()).max(10),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.string()),
  suggested_price: z.number().min(0),
});

export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
