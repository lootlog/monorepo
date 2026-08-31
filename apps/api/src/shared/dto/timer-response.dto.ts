import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { MemberResponseDto } from "./member-response.dto.js";
import { TimerNpcResponseDto } from "./timer-npc-response.dto.js";
import { isoDatetimeCodec } from "./zod-response-codecs.js";
import { Profession } from "#src/db/domain";

const TimerActorCharacterResponseSchema = z
  .object({
    name: z.string(),
    prof: z.nativeEnum(Profession).nullable(),
    icon: z.string().nullable(),
    lvl: z.number().nullable(),
    characterId: z.number(),
    accountId: z.number(),
  })
  .meta({ id: "TimerActorCharacterResponseDto" });

const TimerResponseSchema = z.object({
  guildId: z.string(),
  npcId: z.number(),
  timerKey: z.string(),
  world: z.string(),
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  npc: TimerNpcResponseDto.schema.nullable(),
  wasReset: z.boolean(),
  member: MemberResponseDto.schema.optional(),
  actorCharacter: TimerActorCharacterResponseSchema.optional(),
  deletedAt: isoDatetimeCodec.nullable().optional(),
  updatedAt: isoDatetimeCodec,
});

export class TimerResponseDto extends createZodDto(TimerResponseSchema, {
  codec: true,
}) {}
