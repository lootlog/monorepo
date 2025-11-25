import { z } from "zod";

export const getItemsQuerySchema = z.object({
  limit: z.string().optional().default("3").transform(Number),
  search: z.string().optional(),
  world: z.string().optional(),
});

export type GetItemsDto = z.infer<typeof getItemsQuerySchema>;
