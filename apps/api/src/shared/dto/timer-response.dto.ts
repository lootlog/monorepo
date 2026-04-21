import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { MemberResponseDto } from "./member-response.dto";
import { TimerNpcResponseDto } from "./timer-npc-response.dto";
import { isoDatetimeCodec } from "./zod-response-codecs";

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
  updatedAt: isoDatetimeCodec,
});

export class TimerResponseDto extends createZodDto(TimerResponseSchema, {
  codec: true,
}) {}
