/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- timer settings read and write catalog-validated document JSON; values are typed by the normalizers before they reach the feature. */
import { z } from "zod";
import { isObjectRecord } from "@lootlog/schema/records";
import { NpcType } from "@/api/npcs.api";
import { storageKey } from "@/lib/storage-key";

/**
 * Storage key of the zustand store that held timer preferences before they
 * moved to the settings documents. It is read-only now: the one-time settings
 * import and the filters seed read it, nothing writes it.
 */
export const LEGACY_TIMERS_STORAGE_KEY = storageKey("ll-timers-state");

export const timerGeneralConfigSchema = z.looseObject({
  removeTimerAfterMs: z.number().optional(),
  timersGrouping: z.boolean().optional(),
  timersUnderBag: z.boolean().optional(),
  countdownMode: z.enum(["min", "max"]).optional(),
  compactView: z.boolean().optional(),
});

export const timerDisplayConfigSchema = z.looseObject({
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

export const timersFiltersSchema = z.object({
  minLvl: z.number(),
  maxLvl: z.number(),
  selectedNpcTypes: z.array(z.enum(NpcType)),
  selectedColors: z.array(z.string()),
});

const legacyTimerSnapshot = z.object({
  updatedAt: z.number().optional().catch(undefined),
  generalConfig: timerGeneralConfigSchema.optional().catch(undefined),
  displayConfig: timerDisplayConfigSchema.optional().catch(undefined),
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
    .record(z.string(), timersFiltersSchema)
    .optional()
    .catch(undefined),
  timerFiltersEnabled: z.boolean().optional().catch(undefined),
  colorFiltersEnabled: z.boolean().optional().catch(undefined),
  timersSortOrder: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export type LegacyTimerSnapshot = z.infer<typeof legacyTimerSnapshot>;

export const decodeLegacyTimerSnapshot = (
  value: unknown,
): LegacyTimerSnapshot => {
  const result = legacyTimerSnapshot.safeParse(value);

  return result.success ? result.data : {};
};

/** The raw `state` of the legacy persisted store, or null when absent or corrupt. */
export const readLegacyTimerSnapshot = (): unknown => {
  try {
    const raw = localStorage.getItem(LEGACY_TIMERS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    return isObjectRecord(parsed) ? parsed.state : null;
  } catch {
    return null;
  }
};
