import { Hono } from "hono";
import { parseSchema } from "../lib/utils/schema.js";
import { getNpcsQuerySchema } from "./dto/get-npcs.dto.js";
import { NpcsService } from "./npcs.service.js";

const npcs = new Hono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();
const npcsService = new NpcsService();

npcs.get("/", async (c) => {
  const { limit, search } = parseSchema(c.req.query(), getNpcsQuerySchema);
  const res = await npcsService.getNpcs({ limit, search });

  return c.json(res);
});

export { npcs };
