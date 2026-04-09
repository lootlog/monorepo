import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { MemberResponseDto } from "./member-response.dto";
import { isoDatetimeCodec, jsonValueSchema } from "./zod-response-codecs";

const TimerResponseSchema = z.object({
  guildId: z.string(),
  npcId: z.number(),
  timerKey: z.string(),
  world: z.string(),
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  npc: jsonValueSchema,
  wasReset: z.boolean(),
  member: MemberResponseDto.schema.optional(),
  updatedAt: isoDatetimeCodec,
});

export class TimerResponseDto extends createZodDto(TimerResponseSchema, {
  codec: true,
}) {}
