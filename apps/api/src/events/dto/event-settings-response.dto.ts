import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec } from "src/shared/dto/zod-response-codecs";

const EventSettingsResponseSchema = z.object({
  userId: z.string(),
  guildId: z.string(),
  pinnedEvents: z.array(z.string()),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class EventSettingsResponseDto extends createZodDto(
  EventSettingsResponseSchema,
  {
    codec: true,
  },
) {}
