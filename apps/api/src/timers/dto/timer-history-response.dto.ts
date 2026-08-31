import { db as prismaDb } from "#src/prisma/db";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { MemberResponseDto } from "#src/shared/dto/member-response.dto";
import { TimerNpcResponseDto } from "#src/shared/dto/timer-npc-response.dto";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";

const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession = (typeof Profession)[keyof typeof Profession];
const TimerHistoryAction =
  prismaDb.nativeEnums.public.TimerHistoryAction.members;
type TimerHistoryAction =
  (typeof TimerHistoryAction)[keyof typeof TimerHistoryAction];

const TimerHistoryActorCharacterSchema = z
  .object({
    name: z.string(),
    prof: z.nativeEnum(Profession).nullable(),
    icon: z.string().nullable(),
    lvl: z.number().nullable(),
    characterId: z.number(),
    accountId: z.number(),
  })
  .meta({ id: "TimerHistoryActorCharacterResponseDto" });

const TimerHistoryResponseSchema = z.object({
  id: z.number(),
  guildId: z.string(),
  guildName: z.string(),
  world: z.string(),
  timerKey: z.string(),
  npcId: z.number(),
  npc: TimerNpcResponseDto.schema.nullable(),
  action: z.nativeEnum(TimerHistoryAction),
  member: MemberResponseDto.schema,
  actorCharacter: TimerHistoryActorCharacterSchema.optional(),
  minSpawnTime: isoDatetimeCodec.nullable(),
  maxSpawnTime: isoDatetimeCodec.nullable(),
  canRestore: z.boolean(),
  createdAt: isoDatetimeCodec,
});

export class TimerHistoryResponseDto extends createZodDto(
  TimerHistoryResponseSchema,
  { codec: true },
) {}
