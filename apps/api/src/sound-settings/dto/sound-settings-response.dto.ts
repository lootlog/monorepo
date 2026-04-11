import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  isoDatetimeCodec,
  jsonValueSchema,
} from "src/shared/dto/zod-response-codecs";

const SoundSettingsResponseSchema = z.object({
  userId: z.string(),
  masterVolume: z.number(),
  notificationsVolume: z.number(),
  detectorVolume: z.number(),
  timersVolume: z.number(),
  notificationsConfig: jsonValueSchema,
  detectorConfig: jsonValueSchema,
  timersConfig: jsonValueSchema,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class SoundSettingsResponseDto extends createZodDto(
  SoundSettingsResponseSchema,
  {
    codec: true,
  },
) {}
