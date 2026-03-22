import { z } from "@hono/zod-openapi";
import { itemHitSchema } from "../../items/dto/item-hit.schema.js";
import { npcHitSchema } from "../../npcs/dto/npc-hit.schema.js";
import { playerHitSchema } from "../../players/dto/player-hit.schema.js";

export const searchAllResponseSchema = z
  .object({
    items: z.array(itemHitSchema),
    players: z.array(playerHitSchema),
    npcs: z.array(npcHitSchema),
  })
  .openapi("SearchAllResponse");
