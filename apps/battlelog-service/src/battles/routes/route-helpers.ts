import { OpenAPIHono, z } from "@hono/zod-openapi";
import { validator } from "hono/validator";
import type { AppVariables } from "../../lib/hono.types.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors/http-errors.js";
import type { BattleAnalytics } from "../battle-analytics.js";
import type { BattleStore } from "../battle-store.js";
import type { DrizzleDatabase } from "../../shared/drizzle/drizzle-database.js";

export type BattleRoutesDependencies = {
  battleStore: BattleStore;
  battleAnalytics: BattleAnalytics;
  drizzleDatabase: DrizzleDatabase;
};

export const battleIdParamsSchema = z.object({
  battleId: z.string(),
});

export const searchWarriorsQuerySchema = z.object({
  q: z.string().optional(),
});

export const battleAnalyticsSummarySchema = z.object({
  totalBattles: z.number(),
  wins: z.number(),
  losses: z.number(),
  winRatio: z.number(),
  totalPH: z.number(),
});

export const errorResponseSchema = z.object({
  message: z.string(),
});

export function createBattleRouteGroup() {
  return new OpenAPIHono<{
    Variables: AppVariables;
  }>({ strict: false });
}

export const ensureBattleAccess = (drizzleDatabase: DrizzleDatabase) =>
  validator("param", async (value, c) => {
    const { battleId } = battleIdParamsSchema.parse(value);
    const userId = c.var.userId;

    if (!userId) {
      throw new ForbiddenError("User not authenticated");
    }

    const battle = await drizzleDatabase.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { public: true, userId: true },
    });

    if (!battle) {
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    if (!battle.public && battle.userId !== userId) {
      throw new ForbiddenError(
        "Access denied: Battle is private and you are not the owner",
      );
    }

    return value;
  });

export const ensureBattleOwner = (drizzleDatabase: DrizzleDatabase) =>
  validator("param", async (value, c) => {
    const { battleId } = battleIdParamsSchema.parse(value);
    const userId = c.var.userId;

    if (!userId) {
      throw new ForbiddenError("User not authenticated");
    }

    const battle = await drizzleDatabase.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { userId: true },
    });

    if (!battle) {
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    if (battle.userId !== userId) {
      throw new ForbiddenError("You can only modify your own battles");
    }

    return value;
  });
