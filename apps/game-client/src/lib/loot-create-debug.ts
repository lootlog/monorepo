import { useSettingsStore } from "@/store/settings.store";
import { isObjectRecord } from "@lootlog/schema/records";

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

// Opt-in diagnostics accept fields from several processing stages; values are
// forwarded to the console after removing the private map-player snapshot.
type LootCreateDebugDetails = Record<string, unknown>;

export const logLootCreateDebug = (
  stage: string,
  details: LootCreateDebugDetails,
): void => {
  if (!useSettingsStore.getState().lootDebugLoggingEnabled) {
    return;
  }

  let safeDetails = details;
  if (
    isObjectRecord(details.payload) &&
    "mapPlayersSnapshot" in details.payload
  ) {
    const { mapPlayersSnapshot: _mapPlayersSnapshot, ...payload } =
      details.payload;
    safeDetails = { ...details, payload };
  }

  // oxlint-disable-next-line no-console -- This module intentionally emits opt-in console diagnostics.
  console.log(LOOT_CREATE_DEBUG_PREFIX, {
    ...safeDetails,
    stage,
  });
};
