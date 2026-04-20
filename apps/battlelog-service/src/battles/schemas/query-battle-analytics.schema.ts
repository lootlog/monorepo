import { z } from "@hono/zod-openapi";

const emptyStringToUndefined = (value: unknown) => {
  if (value === "") {
    return undefined;
  }

  return value;
};

const booleanFromQuery = z.preprocess((value) => {
  if (value === "true" || value === true) {
    return true;
  }
  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean());

const intFromQuery = (options?: { min?: number; max?: number }) => {
  let schema = z.coerce.number().int();
  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }
  return z.preprocess(emptyStringToUndefined, schema);
};

export const queryBattleAnalyticsSchema = z.object({
  characterId: z.string().optional(),
  world: z.string().optional(),
  period: z.enum(["24h", "3d", "7d", "14d", "30d", "90d", "180d"]).optional(),
  minLevel: intFromQuery({ min: 1 }).optional(),
  maxLevel: intFromQuery({ min: 1 }).optional(),
  ph: booleanFromQuery.optional(),
  matchmaking: booleanFromQuery.optional(),
});

export type QueryBattleAnalyticsQuery = z.infer<
  typeof queryBattleAnalyticsSchema
>;
