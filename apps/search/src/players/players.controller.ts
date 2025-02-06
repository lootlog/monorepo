import { Hono } from "hono";
import { PlayersService } from "./players.service.js";

const players = new Hono();
const playersService = new PlayersService();

players.get("/", async (c) => {
  const res = await playersService.getPlayers();

  return c.json(res);
});

export { players };
