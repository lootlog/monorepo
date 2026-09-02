import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import {
  isoDatetimeCodec,
  jsonValueSchema,
} from "#src/shared/dto/zod-response-codecs";

const SoundSettingsResponseSchema = z.object({
  userId: z.string(),
  masterVolume: z.number(),
  notificationsVolume: z.number(),
  detectorVolume: z.number(),
  timersVolume: z.number(),
  pingsVolume: z.number(),
  notificationsConfig: jsonValueSchema,
  detectorConfig: jsonValueSchema,
  timersConfig: jsonValueSchema,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class SoundSettingsResponseDto extends createSchemaClass(
  SoundSettingsResponseSchema,
  {
    codec: true,
  },
) {}
