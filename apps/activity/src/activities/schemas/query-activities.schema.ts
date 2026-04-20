import { z } from "@hono/zod-openapi";
import { ActivitySource, ActivityType } from "../../generated/prisma/client.js";

const singleToArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  return [value];
};

export const queryActivitiesSchema = z.object({
  userId: z.string().optional(),
  guildId: z.string().optional(),
  type: z.preprocess(
    singleToArray,
    z.array(z.nativeEnum(ActivityType)).optional(),
  ),
  source: z.preprocess(
    singleToArray,
    z.array(z.nativeEnum(ActivitySource)).optional(),
  ),
  playerName: z.string().optional(),
  clanName: z.string().optional(),
  world: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const actorNameSuggestionsQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const clanNameSuggestionsQuerySchema = actorNameSuggestionsQuerySchema;

export const worldSuggestionsQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type QueryActivitiesSchema = z.infer<typeof queryActivitiesSchema>;
