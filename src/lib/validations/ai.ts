import { z } from 'zod';

/**
 * CategoryResponseSchema
 * Strictly enforces structured output from AI product taxonomist.
 * Defined in prd.md Section 5.3.
 */
export const CategoryResponseSchema = z.object({
  category: z.string().min(1),
  sub_category: z.string().min(1),
  tags: z.array(z.string()).max(5),
  confidence: z.number().min(0).max(1),
});

export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
