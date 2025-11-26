import { Hono } from "hono";
import { parseSchema } from "../lib/utils/schema.js";
import { getItemsQuerySchema } from "./dto/get-items.dto.js";
import { ItemsService } from "./items.service.js";

const items = new Hono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();
const itemsService = new ItemsService();

items.get("/", async (c) => {
  const { limit, search, world } = parseSchema(
    c.req.query(),
    getItemsQuerySchema,
  );
  const res = await itemsService.getItems({ limit, search, world });

  return c.json(res);
});

export { items };
