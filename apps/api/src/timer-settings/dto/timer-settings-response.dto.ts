import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  isoDatetimeCodec,
  jsonValueSchema,
} from "src/shared/dto/zod-response-codecs";

const TimerSettingsResponseSchema = z.object({
  userId: z.string(),
  generalConfig: jsonValueSchema,
  displayConfig: jsonValueSchema,
  customColors: jsonValueSchema,
  timersColors: jsonValueSchema,
  defaultColorNames: jsonValueSchema,
  overriddenDefaultColors: jsonValueSchema,
  hiddenDefaultColors: z.array(z.string()),
  timerFiltersEnabled: z.boolean(),
  colorFiltersEnabled: z.boolean(),
  timersSortOrder: z.enum(["asc", "desc"]),
  syncEnabled: z.boolean(),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class TimerSettingsResponseDto extends createZodDto(
  TimerSettingsResponseSchema,
  {
    codec: true,
  },
) {}

const GuildTimerSettingsResponseSchema = z.object({
  userId: z.string(),
  guildId: z.string(),
  hiddenTimers: z.array(z.string()),
  pinnedTimers: z.array(z.string()),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class GuildTimerSettingsResponseDto extends createZodDto(
  GuildTimerSettingsResponseSchema,
  {
    codec: true,
  },
) {}
