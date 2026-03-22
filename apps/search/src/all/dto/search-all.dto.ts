import { z } from "@hono/zod-openapi";

export const searchAllQuerySchema = z.object({
  limit: z.coerce
    .number()
    .optional()
    .default(10)
    .openapi({ param: { name: "limit", in: "query" }, example: 10 }),
  search: z
    .string()
    .optional()
    .openapi({ param: { name: "search", in: "query" }, example: "sword" }),
  world: z
    .string()
    .optional()
    .openapi({ param: { name: "world", in: "query" }, example: "tempest" }),
});

export type SearchAllDto = z.infer<typeof searchAllQuerySchema>;
