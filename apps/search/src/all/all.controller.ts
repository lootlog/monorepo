import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { searchAllQuerySchema } from "./dto/search-all.dto.js";
import { searchAllResponseSchema } from "./dto/search-all-response.schema.js";
import { AllService } from "./all.service.js";

const allService = new AllService();

const searchAllRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["All"],
  summary: "Search across all categories",
  request: {
    query: searchAllQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: searchAllResponseSchema,
        },
      },
      description: "Aggregated search results across items, players, and NPCs",
    },
  },
});

const all = new OpenAPIHono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();

all.openapi(searchAllRoute, async (c) => {
  const { limit, search, world } = c.req.valid("query");
  const res = await allService.searchAll({ limit, search, world });

  return c.json(res, 200);
});

export { all };
