import { z } from "@hono/zod-openapi";

export const playerHitSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    lvl: z.number(),
    prof: z.string(),
    icon: z.string(),
    characterId: z.number(),
    accountId: z.number(),
    world: z.string(),
  })
  .openapi("PlayerHit");
