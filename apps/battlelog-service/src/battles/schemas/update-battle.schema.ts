import { z } from "@hono/zod-openapi";

export const updateBattleSchema = z.object({
  public: z.boolean(),
});

export type UpdateBattleInput = z.infer<typeof updateBattleSchema>;
