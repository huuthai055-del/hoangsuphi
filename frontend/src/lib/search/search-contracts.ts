import { z } from "zod";

const searchResultSchema = z.object({
  entityType: z.enum(["place", "business", "article", "attraction"]),
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  region: z.object({ id: z.string().uuid(), slug: z.string(), name: z.string() }).nullable(),
  category: z.object({ id: z.string().uuid(), slug: z.string(), name: z.string() }).nullable(),
  rating: z.number().nullable(),
  priceMin: z.string().nullable(),
  priceMax: z.string().nullable(),
  relevance: z.number().nullable(),
});

export const searchAutocompleteResponseSchema = z.object({
  data: z.array(searchResultSchema).max(8),
  meta: z.object({
    cursor: z.string().nullable(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    totalReturned: z.number().int().min(0).max(8),
  }),
  error: z.null(),
});

export type SearchAutocompleteResponse = z.infer<typeof searchAutocompleteResponseSchema>;
export type SearchAutocompleteResult = SearchAutocompleteResponse["data"][number];
