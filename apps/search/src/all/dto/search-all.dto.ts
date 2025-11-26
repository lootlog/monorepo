import { z } from "zod";

export const searchAllQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  search: z.string().optional(),
  world: z.string().optional(),
});

export type SearchAllDto = z.infer<typeof searchAllQuerySchema>;
