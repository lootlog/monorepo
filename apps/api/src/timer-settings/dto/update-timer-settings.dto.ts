import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const TimersGeneralConfigSchema = z.object({
  removeTimerAfterMs: z.number().min(0).optional(),
  compactView: z.boolean().optional(),
  timersGrouping: z.boolean().optional(),
  timersUnderBag: z.boolean().optional(),
  countdownMode: z.enum(["min", "max"]).optional(),
});

const TimersDisplayConfigSchema = z.object({
  showType: z.boolean().optional(),
  showLevel: z.boolean().optional(),
  fontSize: z.number().min(8).max(24).optional(),
  minColumnWidth: z.number().min(50).max(500).optional(),
  singleTimerDisplayMode: z.enum(["column", "row"]).optional(),
});

const UpdateTimerSettingsSchema = z.object({
  generalConfig: TimersGeneralConfigSchema.optional(),
  displayConfig: TimersDisplayConfigSchema.optional(),
  customColors: z
    .record(
      z.string(),
      z.object({
        id: z.string(),
        name: z.string(),
        borderColor: z.string(),
        backgroundColor: z.string(),
      }),
    )
    .optional(),
  timersColors: z.record(z.string(), z.string().optional()).optional(),
  alwaysVisibleExpiredTimers: z
    .record(z.string(), z.array(z.string()))
    .optional(),
  defaultColorNames: z.record(z.string(), z.string()).optional(),
  overriddenDefaultColors: z
    .record(
      z.string(),
      z.object({
        borderColor: z.string(),
        backgroundColor: z.string(),
      }),
    )
    .optional(),
  hiddenDefaultColors: z.array(z.string()).optional(),
  timerFiltersEnabled: z.boolean().optional(),
  colorFiltersEnabled: z.boolean().optional(),
  timersSortOrder: z.enum(["asc", "desc"]).optional(),
  syncEnabled: z.boolean().optional(),
});

export class UpdateTimerSettingsDto extends createZodDto(
  UpdateTimerSettingsSchema,
) {}
