import { useSettingsStore } from "@/store/settings.store";

export const LOOT_CREATE_DEBUG_PREFIX = "[DEBUG-loot-create]";

export type LootCreateDebugContext = {
  attemptId: string;
  source: "dialog" | "fight";
};

export const createLootDebugContext = (
  source: LootCreateDebugContext["source"],
): LootCreateDebugContext => ({
  attemptId: crypto.randomUUID(),
  source,
});

export const logLootCreateDebug = (
  stage: string,
  details: Record<string, unknown>,
): void => {
  if (!useSettingsStore.getState().lootDebugLoggingEnabled) {
    return;
  }

  // oxlint-disable-next-line no-console -- This module intentionally emits opt-in console diagnostics.
  console.log(LOOT_CREATE_DEBUG_PREFIX, {
    ...details,
    stage,
  });
};
