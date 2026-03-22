import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getNpcsQuerySchema } from "./dto/get-npcs.dto.js";
import { npcHitSchema } from "./dto/npc-hit.schema.js";
import { NpcsService } from "./npcs.service.js";

const npcsService = new NpcsService();

const getNpcsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["NPCs"],
  summary: "Search NPCs by name",
  request: {
    query: getNpcsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(npcHitSchema),
        },
      },
      description: "List of matching NPCs",
    },
  },
});

const npcs = new OpenAPIHono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();

npcs.openapi(getNpcsRoute, async (c) => {
  const { limit, search, world } = c.req.valid("query");
  const res = await npcsService.getNpcs({ limit, search, world });

  return c.json(res, 200);
});

export { npcs };
