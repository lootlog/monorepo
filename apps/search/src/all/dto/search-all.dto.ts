import { z } from "zod";

export const searchAllQuerySchema = z.object({
  limit: z.string().optional().default("10").transform(Number),
  search: z.string().optional(),
  world: z.string().optional(),
});

export type SearchAllDto = z.infer<typeof searchAllQuerySchema>;
