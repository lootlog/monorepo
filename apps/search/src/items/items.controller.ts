import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getItemsQuerySchema } from "./dto/get-items.dto.js";
import { itemHitSchema } from "./dto/item-hit.schema.js";
import { ItemsService } from "./items.service.js";

const itemsService = new ItemsService();

const getItemsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Items"],
  summary: "Search items by name",
  request: {
    query: getItemsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(itemHitSchema),
        },
      },
      description: "List of matching items",
    },
  },
});

const items = new OpenAPIHono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();

items.openapi(getItemsRoute, async (c) => {
  const { limit, search, world } = c.req.valid("query");
  const res = await itemsService.getItems({ limit, search, world });

  return c.json(res, 200);
});

export { items };
