import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPlayersQuerySchema } from "./dto/get-players.dto.js";
import { playerHitSchema } from "./dto/player-hit.schema.js";
import { PlayersService } from "./players.service.js";

const playersService = new PlayersService();

const getPlayersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Players"],
  summary: "Search players by name",
  request: {
    query: getPlayersQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(playerHitSchema),
        },
      },
      description: "List of matching players",
    },
  },
});

const players = new OpenAPIHono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();

players.openapi(getPlayersRoute, async (c) => {
  const { limit, search, world } = c.req.valid("query");
  const res = await playersService.getPlayers({ limit, search, world });

  return c.json(res, 200);
});

export { players };
