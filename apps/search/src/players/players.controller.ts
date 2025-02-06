import { Hono } from "hono";
import { PlayersService } from "./players.service.js";
import { parseSchema } from "../lib/utils/schema.js";
import { parseQueryParams } from "../lib/utils/query-params.js";
import { getPlayersQuerySchema } from "./dto/get-players.dto.js";

const players = new Hono();
const playersService = new PlayersService();

players.get("/", async (c) => {
  const { limit, search } = parseSchema(c.req.query(), getPlayersQuerySchema);
  const res = await playersService.getPlayers({ limit, search });

  return c.json(res);
});

export { players };
