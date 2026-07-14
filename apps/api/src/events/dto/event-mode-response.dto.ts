import { createZodDto } from "nestjs-zod";
import { isoDatetimeCodec } from "src/shared/dto/zod-response-codecs";
import { z } from "zod";

const EventModeAssignmentSchema = z.object({
  eventMapId: z.string(),
  heroId: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  margonemMapId: z.number(),
  mapName: z.string(),
});

const EventModeRespawnSchema = z.object({
  heroId: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  status: z.enum(["WAITING", "OPEN", "OVERDUE"]),
});

const EventModeEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  world: z.string(),
  guild: z.object({
    id: z.string(),
    name: z.string(),
  }),
  assignments: z.array(EventModeAssignmentSchema),
  nextRespawn: EventModeRespawnSchema.nullable(),
});

const EventModeResponseSchema = z.object({
  generatedAt: isoDatetimeCodec,
  events: z.array(EventModeEventSchema),
});

export class EventModeResponseDto extends createZodDto(
  EventModeResponseSchema,
  {
    codec: true,
  },
) {}
