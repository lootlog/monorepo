import { z } from "zod";
import { createZodDto, type ZodDto } from "nestjs-zod";
import { db as prismaDb } from "../../prisma/db.js";

const ActivitySource = prismaDb.nativeEnums.public.ActivitySource.members;
type ActivitySource = (typeof ActivitySource)[keyof typeof ActivitySource];
const ActivityType = prismaDb.nativeEnums.public.ActivityType.members;
type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

const GAME_SOURCE_REQUIRED_FIELDS = [
  "accountId",
  "characterId",
  "clanName",
  "clanId",
  "icon",
  "lvl",
  "prof",
] as const;

const ActorSnapshotSchema = z.object({
  accountId: z.number().optional(),
  characterId: z.number().optional(),
  name: z.string().optional(),
  clanName: z.string().optional(),
  clanId: z.number().optional(),
  icon: z.string().optional(),
  lvl: z.number().optional(),
  prof: z.string().optional(),
});

export const CreateActivitySchema = z
  .object({
    userId: z.string().min(1),
    guildId: z.string().min(1),
    discordId: z.string().min(1),
    type: z.nativeEnum(ActivityType),
    source: z.nativeEnum(ActivitySource),
    world: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    actorSnapshot: ActorSnapshotSchema.optional(),
    idempotencyKey: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (
      (data.type === ActivityType.CONNECT_EVENT ||
        data.type === ActivityType.DISCONNECT_EVENT) &&
      (typeof data.details?.sessionId !== "string" ||
        data.details.sessionId.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "details.sessionId is required for session activity",
        path: ["details", "sessionId"],
      });
    }

    if (data.source !== ActivitySource.GAME) return;

    if (!data.actorSnapshot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "actorSnapshot is required when source is GAME",
        path: ["actorSnapshot"],
      });
      return;
    }

    const missingFields = GAME_SOURCE_REQUIRED_FIELDS.filter((field) => {
      const value = data.actorSnapshot![field];
      return value === null || value === undefined;
    });

    if (missingFields.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `actorSnapshot is missing required fields for GAME source: ${missingFields.join(", ")}`,
        path: ["actorSnapshot"],
      });
    }
  });

const CreateActivityDtoBase: ZodDto<typeof CreateActivitySchema> =
  createZodDto(CreateActivitySchema);

export class CreateActivityDto extends CreateActivityDtoBase {}
