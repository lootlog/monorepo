import { Hono } from "hono";
import { parseSchema } from "../lib/utils/schema.js";
import { searchAllQuerySchema } from "./dto/search-all.dto.js";
import { AllService } from "./all.service.js";

const all = new Hono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();
const allService = new AllService();

all.get("/", async (c) => {
  const { limit, search, world } = parseSchema(
    c.req.query(),
    searchAllQuerySchema
  );
  const res = await allService.searchAll({ limit, search, world });

  return c.json(res);
});

export { all };
