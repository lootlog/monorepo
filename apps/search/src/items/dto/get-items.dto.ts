import { z } from "@hono/zod-openapi";

export const getItemsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("3")
    .transform(Number)
    .openapi({ param: { name: "limit", in: "query" }, example: "3" }),
  search: z
    .string()
    .optional()
    .openapi({ param: { name: "search", in: "query" }, example: "sword" }),
  world: z
    .string()
    .optional()
    .openapi({ param: { name: "world", in: "query" }, example: "tempest" }),
});

export type GetItemsDto = z.infer<typeof getItemsQuerySchema>;
