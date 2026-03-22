import { z } from "@hono/zod-openapi";

export const getNpcsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("10")
    .transform(Number)
    .openapi({ param: { name: "limit", in: "query" }, example: "10" }),
  search: z
    .string()
    .optional()
    .transform((val) => {
      if (val?.includes(",")) {
        return val.split(",").map((s) => s.trim());
      }

      return val;
    })
    .openapi({
      param: { name: "search", in: "query" },
      example: "goblin,orc",
      description:
        "Search term. Comma-separated for multiple exact name matches.",
    }),
  world: z
    .string()
    .optional()
    .openapi({ param: { name: "world", in: "query" }, example: "tempest" }),
});

export type GetNpcsDto = z.infer<typeof getNpcsQuerySchema>;
