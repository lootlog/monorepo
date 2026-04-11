import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";
import { ActivitySource, ActivityType } from "src/generated/prisma/client";
import {
  isoDatetimeCodec,
  unknownRecordSchema,
} from "src/shared/dto/zod-response-codecs";

const ActivityActorSnapshotResponseSchema = z.object({
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
  createdAt: isoDatetimeCodec,
});

const ActivityActorSnapshotResponseDtoBase: ZodDto<
  typeof ActivityActorSnapshotResponseSchema,
  true
> = createZodDto(ActivityActorSnapshotResponseSchema, {
  codec: true,
});

export class ActivityActorSnapshotResponseDto extends ActivityActorSnapshotResponseDtoBase {}

const ActivityResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  guildId: z.string(),
  discordId: z.string(),
  type: z.nativeEnum(ActivityType),
  source: z.nativeEnum(ActivitySource),
  createdAt: isoDatetimeCodec,
  world: z.string().nullable().optional(),
  details: unknownRecordSchema.optional(),
  actorSnapshot: ActivityActorSnapshotResponseSchema.optional(),
});

const ActivityResponseDtoBase: ZodDto<typeof ActivityResponseSchema, true> =
  createZodDto(ActivityResponseSchema, {
    codec: true,
  });

export class ActivityResponseDto extends ActivityResponseDtoBase {}

const PaginatedActivitiesResponseSchema = z.object({
  data: z.array(ActivityResponseSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

const PaginatedActivitiesResponseDtoBase: ZodDto<
  typeof PaginatedActivitiesResponseSchema,
  true
> = createZodDto(PaginatedActivitiesResponseSchema, {
  codec: true,
});

export class PaginatedActivitiesResponseDto extends PaginatedActivitiesResponseDtoBase {}

const ActorNameSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

const ActorNameSuggestionsResponseDtoBase: ZodDto<
  typeof ActorNameSuggestionsResponseSchema,
  false
> = createZodDto(ActorNameSuggestionsResponseSchema);

export class ActorNameSuggestionsResponseDto extends ActorNameSuggestionsResponseDtoBase {}

const WorldSuggestionsResponseSchema = z.object({
  worlds: z.array(z.string()),
});

const WorldSuggestionsResponseDtoBase: ZodDto<
  typeof WorldSuggestionsResponseSchema,
  false
> = createZodDto(WorldSuggestionsResponseSchema);

export class WorldSuggestionsResponseDto extends WorldSuggestionsResponseDtoBase {}

const ClanNameSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

const ClanNameSuggestionsResponseDtoBase: ZodDto<
  typeof ClanNameSuggestionsResponseSchema,
  false
> = createZodDto(ClanNameSuggestionsResponseSchema);

export class ClanNameSuggestionsResponseDto extends ClanNameSuggestionsResponseDtoBase {}

const DeleteActivityResponseSchema = z.object({
  count: z.number(),
});

const DeleteActivityResponseDtoBase: ZodDto<
  typeof DeleteActivityResponseSchema,
  false
> = createZodDto(DeleteActivityResponseSchema);

export class DeleteActivityResponseDto extends DeleteActivityResponseDtoBase {}
