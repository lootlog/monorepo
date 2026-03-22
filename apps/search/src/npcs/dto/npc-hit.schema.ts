import { z } from "@hono/zod-openapi";

export const npcHitSchema = z
  .object({
    id: z.number(),
    prof: z.string(),
    icon: z.string(),
    name: z.string(),
    lvl: z.number(),
    wt: z.number(),
    type: z.string(),
    margonemType: z.number(),
    world: z.string(),
  })
  .openapi("NpcHit");
