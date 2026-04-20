import { z } from "@hono/zod-openapi";
import { ActivitySource, ActivityType } from "../../generated/prisma/client.js";

export const unknownRecordSchema = z.record(z.string(), z.unknown());

export const activityActorSnapshotSchema = z
  .object({
    id: z.string(),
    accountId: z.number(),
    characterId: z.number(),
    name: z.string(),
    clanName: z.string().nullable().optional(),
    clanId: z.number().nullable().optional(),
    icon: z.string(),
    lvl: z.number(),
    prof: z.string(),
    source: z.nativeEnum(ActivitySource),
    createdAt: z.string().datetime({ offset: true }),
  })
  .openapi("ActivityActorSnapshot");

export const activityResponseSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    guildId: z.string(),
    discordId: z.string(),
    type: z.nativeEnum(ActivityType),
    source: z.nativeEnum(ActivitySource),
    createdAt: z.string().datetime({ offset: true }),
    world: z.string().nullable().optional(),
    details: unknownRecordSchema.optional(),
    actorSnapshot: activityActorSnapshotSchema.optional(),
  })
  .openapi("ActivityResponse");

export const paginatedActivitiesResponseSchema = z.object({
  data: z.array(activityResponseSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

export const actorNameSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

export const clanNameSuggestionsResponseSchema =
  actorNameSuggestionsResponseSchema;

export const worldSuggestionsResponseSchema = z.object({
  worlds: z.array(z.string()),
});

export const deleteActivityResponseSchema = z.object({
  count: z.number(),
});
