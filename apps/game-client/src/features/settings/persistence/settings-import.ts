/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import { storageKey } from "@/lib/storage-key";
import { isObjectRecord } from "@lootlog/schema/records";
import type { SettingsDomain } from "@lootlog/schema/settings-documents";
import { decodeTimerSettings } from "@/store/timer-settings-codec";
import {
  areSettingsValuesEqual,
  getSettingsDefaultValue,
  hasStoredSettingsValue,
  type GuildSettingsDocuments,
  type SettingsDocuments,
} from "./settings-documents";
import type { EnqueueSettingsPatchInput } from "./settings-patch-client";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/store/timer-settings-sync";

export const SETTINGS_IMPORT_STORAGE_KEY = storageKey("ll:settings:import");

const IMPORT_VERSION = 1;

export type SettingsImportState = {
  version: number;
  done: Partial<Record<SettingsDomain, true>>;
};

export const readSettingsImportState = (): SettingsImportState => {
  try {
    const raw = localStorage.getItem(SETTINGS_IMPORT_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (
      isObjectRecord(parsed) &&
      parsed.version === IMPORT_VERSION &&
      isObjectRecord(parsed.done)
    ) {
      const done: SettingsImportState["done"] = {};

      for (const [domain, value] of Object.entries(parsed.done)) {
        if (value !== true) continue;
        // SAFETY: only catalog domains are ever written to the done map.
        const catalogDomain = domain as SettingsDomain;
        done[catalogDomain] = true;
      }

      return { version: IMPORT_VERSION, done };
    }
  } catch {
    // A corrupt flag only means the import runs again; server values still win.
  }

  return { version: IMPORT_VERSION, done: {} };
};

export const markSettingsImportDone = (domain: SettingsDomain) => {
  const state = readSettingsImportState();
  state.done[domain] = true;
  localStorage.setItem(SETTINGS_IMPORT_STORAGE_KEY, JSON.stringify(state));
};

export type LocalSettingsSnapshot = {
  /** Raw persisted timers store state (decoded through the codec). */
  timers: unknown;
  hotkeys: Record<string, unknown>;
  allowWorldSelection: boolean | undefined;
  battlePanel: { isBattleCollectionEnabled: boolean } | undefined;
};

const hasContent = (value: unknown) =>
  isObjectRecord(value)
    ? Object.keys(value).length > 0
    : Array.isArray(value)
      ? value.length > 0
      : value !== undefined;

type ImportPlan = {
  patches: EnqueueSettingsPatchInput[];
  domains: SettingsDomain[];
};

type ImportContext = {
  documents: SettingsDocuments;
  /** Guild timer documents of every accessible guild; required to import guild lists. */
  guildDocuments: GuildSettingsDocuments | undefined;
  local: LocalSettingsSnapshot;
  done: SettingsImportState["done"];
  accessibleGuildIds: readonly string[];
  hasCharacterScope: boolean;
};

const TIMER_BEHAVIOR_FIELDS = [
  "generalConfig",
  "alwaysVisibleExpiredTimers",
  "timerFiltersEnabled",
  "colorFiltersEnabled",
  "timersSortOrder",
] as const;

const TIMER_APPEARANCE_FIELDS = [
  "displayConfig",
  "customColors",
  "timersColors",
  "defaultColorNames",
  "overriddenDefaultColors",
  "hiddenDefaultColors",
] as const;

const isImportable = (
  documents: SettingsDocuments | undefined,
  key: Parameters<typeof hasStoredSettingsValue>[1],
) => !hasStoredSettingsValue(documents, key);

const differsFromDefault = (
  key: Parameters<typeof getSettingsDefaultValue>[0],
  value: unknown,
) => !areSettingsValuesEqual(value, getSettingsDefaultValue(key));

const collectTimerBehaviorImport = (
  documents: SettingsDocuments,
  timers: ReturnType<typeof decodeTimerSettings>,
) => {
  const behavior: Record<string, unknown> = {};

  for (const field of TIMER_BEHAVIOR_FIELDS) {
    const value = timers[field];
    const key = `timers.${field}` as const;

    if (
      value !== undefined &&
      isImportable(documents, key) &&
      differsFromDefault(key, value)
    ) {
      behavior[field] = value;
    }
  }

  for (const field of ["hiddenTimers", "pinnedTimers"] as const) {
    const globalList = timers[field]?.[GLOBAL_TIMER_SETTINGS_KEY];

    if (globalList?.length && isImportable(documents, `timers.${field}`)) {
      behavior[field] = globalList;
    }
  }

  return behavior;
};

const collectTimerAppearanceImport = (
  documents: SettingsDocuments,
  timers: ReturnType<typeof decodeTimerSettings>,
) => {
  const appearance: Record<string, unknown> = {};

  for (const field of TIMER_APPEARANCE_FIELDS) {
    const value = timers[field];
    const key = `appearance.timers.${field}` as const;

    if (
      value === undefined ||
      !hasContent(value) ||
      !isImportable(documents, key) ||
      !differsFromDefault(key, value)
    ) {
      continue;
    }

    appearance[field] =
      field === "timersColors"
        ? Object.fromEntries(
            Object.entries(value).filter(
              (entry): entry is [string, string] => entry[1] !== undefined,
            ),
          )
        : value;
  }

  return appearance;
};

const collectGuildTimerListImports = (
  timers: ReturnType<typeof decodeTimerSettings>,
  accessibleGuildIds: readonly string[],
  guildDocuments: GuildSettingsDocuments | undefined,
) => {
  const patches: EnqueueSettingsPatchInput[] = [];

  for (const field of ["hiddenTimers", "pinnedTimers"] as const) {
    for (const [guildId, list] of Object.entries(timers[field] ?? {})) {
      // A guild list already stored on the server (by another browser or the
      // legacy migration endpoint) wins over a stale local copy.
      if (
        guildId === GLOBAL_TIMER_SETTINGS_KEY ||
        list.length === 0 ||
        !accessibleGuildIds.includes(guildId) ||
        !isImportable(guildDocuments?.guilds[guildId], `timers.${field}`)
      ) {
        continue;
      }

      patches.push({
        domain: "timers",
        scopeType: "GUILD",
        guildId,
        set: { [field]: list },
      });
    }
  }

  return patches;
};

const planTimersImport = (
  { documents, guildDocuments, local, accessibleGuildIds }: ImportContext,
  plan: ImportPlan,
) => {
  const timers = decodeTimerSettings(local.timers);
  plan.domains.push("timers");

  if (timers.updatedAt === undefined) return;
  const behavior = collectTimerBehaviorImport(documents, timers);
  const appearance = collectTimerAppearanceImport(documents, timers);
  plan.patches.push(
    ...collectGuildTimerListImports(timers, accessibleGuildIds, guildDocuments),
  );

  if (Object.keys(behavior).length > 0) {
    plan.patches.push({ domain: "timers", set: behavior });
  }

  if (Object.keys(appearance).length > 0) {
    plan.patches.push({ domain: "appearance", set: { timers: appearance } });
    plan.domains.push("appearance");
  }
};

const planControlsImport = (
  { documents, local }: ImportContext,
  plan: ImportPlan,
) => {
  plan.domains.push("controls");

  if (
    isImportable(documents, "controls.hotkeys") &&
    Object.keys(local.hotkeys).length > 0
  ) {
    plan.patches.push({ domain: "controls", set: { hotkeys: local.hotkeys } });
  }
};

const planGeneralImport = (
  { documents, local }: ImportContext,
  plan: ImportPlan,
) => {
  plan.domains.push("general");

  if (
    isImportable(documents, "general.allowWorldSelection") &&
    local.allowWorldSelection !== undefined &&
    differsFromDefault("general.allowWorldSelection", local.allowWorldSelection)
  ) {
    plan.patches.push({
      domain: "general",
      set: { allowWorldSelection: local.allowWorldSelection },
    });
  }
};

const planGameDataImport = (
  { documents, local, hasCharacterScope }: ImportContext,
  plan: ImportPlan,
) => {
  if (!hasCharacterScope) return;
  plan.domains.push("gameData");

  if (
    isImportable(documents, "gameData.battlePanel") &&
    local.battlePanel &&
    differsFromDefault("gameData.battlePanel", local.battlePanel)
  ) {
    plan.patches.push({
      domain: "gameData",
      scopeType: "CHARACTER",
      set: { battlePanel: local.battlePanel },
    });
  }
};

/**
 * Chooses which browser-only values are worth sending to the server: only
 * fields the server still resolves to catalog defaults, and only when the
 * local value differs from that default. Everything else defers to the server.
 */
export const planSettingsImport = (context: ImportContext): ImportPlan => {
  const plan: ImportPlan = { patches: [], domains: [] };

  if (!context.done.timers) planTimersImport(context, plan);

  if (!context.done.controls) planControlsImport(context, plan);

  if (!context.done.general) planGeneralImport(context, plan);

  if (!context.done.gameData) planGameDataImport(context, plan);

  return plan;
};
