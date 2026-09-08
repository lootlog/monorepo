import { z } from "zod";
import { NpcType } from "@/api/npcs.api";

const generalConfig = z.looseObject({
  removeTimerAfterMs: z.number().optional(),
  timersGrouping: z.boolean().optional(),
  timersUnderBag: z.boolean().optional(),
  countdownMode: z.enum(["min", "max"]).optional(),
  compactView: z.boolean().optional(),
});
const displayConfig = z.looseObject({
  showType: z.boolean().optional(),
  showLevel: z.boolean().optional(),
  fontSize: z.number().optional(),
  minColumnWidth: z.number().optional(),
  singleTimerDisplayMode: z.enum(["column", "row"]).optional(),
});
const stringLists = z.record(z.string(), z.array(z.string()));
const color = z.object({
  borderColor: z.string(),
  backgroundColor: z.string(),
});
const persistedTimerSettings = z.object({
  updatedAt: z.number().optional().catch(undefined),
  generalConfig: generalConfig.optional().catch(undefined),
  displayConfig: displayConfig.optional().catch(undefined),
  hiddenTimers: stringLists.optional().catch(undefined),
  pinnedTimers: stringLists.optional().catch(undefined),
  alwaysVisibleExpiredTimers: stringLists.optional().catch(undefined),
  timersColors: z
    .record(z.string(), z.string().optional())
    .optional()
    .catch(undefined),
  customColors: z
    .record(z.string(), color.extend({ id: z.string(), name: z.string() }))
    .optional()
    .catch(undefined),
  defaultColorNames: z
    .record(z.string(), z.string())
    .optional()
    .catch(undefined),
  overriddenDefaultColors: z
    .record(z.string(), color)
    .optional()
    .catch(undefined),
  hiddenDefaultColors: z.array(z.string()).optional().catch(undefined),
  timersFilters: z
    .record(
      z.string(),
      z.object({
        minLvl: z.number(),
        maxLvl: z.number(),
        selectedNpcTypes: z.array(z.enum(NpcType)),
        selectedColors: z.array(z.string()),
      }),
    )
    .optional()
    .catch(undefined),
  timerFiltersEnabled: z.boolean().optional().catch(undefined),
  colorFiltersEnabled: z.boolean().optional().catch(undefined),
  timersSortOrder: z.enum(["asc", "desc"]).optional().catch(undefined),
  syncEnabled: z.boolean().optional().catch(undefined),
});

export const decodeTimerSettings = (value: unknown) => {
  const result = persistedTimerSettings.safeParse(value);
  return result.success ? result.data : {};
};
