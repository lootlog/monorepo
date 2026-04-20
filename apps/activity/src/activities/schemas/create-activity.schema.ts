import { z } from "@hono/zod-openapi";
import { ActivitySource, ActivityType } from "../../generated/prisma/client.js";

const gameSourceRequiredFields = [
  "accountId",
  "characterId",
  "clanName",
  "clanId",
  "icon",
  "lvl",
  "prof",
] as const;

export const actorSnapshotSchema = z.object({
  accountId: z.number().optional(),
  characterId: z.number().optional(),
  name: z.string().optional(),
  clanName: z.string().optional(),
  clanId: z.number().optional(),
  icon: z.string().optional(),
  lvl: z.number().optional(),
  prof: z.string().optional(),
});

export const createActivitySchema = z
  .object({
    userId: z.string().min(1),
    guildId: z.string().min(1),
    discordId: z.string().min(1),
    type: z.nativeEnum(ActivityType),
    source: z.nativeEnum(ActivitySource),
    world: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    actorSnapshot: actorSnapshotSchema.optional(),
    idempotencyKey: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.source !== ActivitySource.GAME) {
      return;
    }

    if (!data.actorSnapshot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "actorSnapshot is required when source is GAME",
        path: ["actorSnapshot"],
      });
      return;
    }

    const missingFields = gameSourceRequiredFields.filter((field) => {
      const value = data.actorSnapshot?.[field];
      return value === null || value === undefined;
    });

    if (missingFields.length === 0) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `actorSnapshot is missing required fields for GAME source: ${missingFields.join(", ")}`,
      path: ["actorSnapshot"],
    });
  });

export type CreateActivitySchema = z.infer<typeof createActivitySchema>;
