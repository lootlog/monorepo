import { z } from "@hono/zod-openapi";

export const itemHitSchema = z
  .object({
    id: z.number(),
    hid: z.string(),
    name: z.string(),
    icon: z.string(),
    lvl: z.number(),
    rarity: z.string().nullable(),
    type: z.string().nullable(),
    world: z.string(),
  })
  .openapi("ItemHit");
