import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import { Profession, TimerHistoryAction } from "../timers.types.js";
import { MemberResponseDto } from "#src/shared/dto/member-response.dto";
import { TimerNpcResponseDto } from "#src/shared/dto/timer-npc-response.dto";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";

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
