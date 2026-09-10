import { beforeEach, describe, expect, it } from "vitest";
import {
  createSettingsDocuments,
  applySettingsDocumentValues,
} from "@/test/settings-documents-fixtures";
import {
  markSettingsImportDone,
  planSettingsImport,
  readSettingsImportState,
  SETTINGS_IMPORT_STORAGE_KEY,
} from "./settings-import";

const localTimers = {
  updatedAt: 1,
  generalConfig: {
    removeTimerAfterMs: 45_000,
    timersGrouping: true,
    timersUnderBag: false,
    countdownMode: "max",
    compactView: true,
  },
  timersSortOrder: "asc",
  timersColors: { Tanroth: "red", Heros: undefined },
  customColors: {},
  hiddenTimers: { global: ["a"], "guild-1": ["b"], "guild-9": ["c"] },
  pinnedTimers: {},
};

const localSnapshot = {
  timers: localTimers,
  hotkeys: { "toggle-chat": { type: "keyboard", key: "c" } },
  allowWorldSelection: true,
  battlePanel: { isBattleCollectionEnabled: true },
};

describe("planSettingsImport", () => {
  beforeEach(() => {
    localStorage.removeItem(SETTINGS_IMPORT_STORAGE_KEY);
  });

  it("imports only browser values that differ from defaults where the server holds defaults", () => {
    const plan = planSettingsImport({
      documents: createSettingsDocuments(),
      local: localSnapshot,
      done: {},
      accessibleGuildIds: ["guild-1"],
      hasCharacterScope: true,
    });

    expect(plan.patches).toEqual([
      {
        domain: "timers",
        scopeType: "GUILD",
        guildId: "guild-1",
        set: { hiddenTimers: ["b"] },
      },
      {
        domain: "timers",
        set: {
          generalConfig: localTimers.generalConfig,
          hiddenTimers: ["a"],
        },
      },
      {
        domain: "appearance",
        set: { timers: { timersColors: { Tanroth: "red" } } },
      },
      { domain: "controls", set: { hotkeys: localSnapshot.hotkeys } },
      { domain: "general", set: { allowWorldSelection: true } },
      {
        domain: "gameData",
        scopeType: "CHARACTER",
        set: { battlePanel: { isBattleCollectionEnabled: true } },
      },
    ]);
    expect(plan.domains).toEqual([
      "timers",
      "appearance",
      "controls",
      "general",
      "gameData",
    ]);
  });

  it("lets stored server values win over local ones", () => {
    const documents = applySettingsDocumentValues(createSettingsDocuments(), {
      "timers.generalConfig": { removeTimerAfterMs: 10_000 },
      "controls.hotkeys": {},
      "general.allowWorldSelection": false,
    });

    const plan = planSettingsImport({
      documents,
      local: localSnapshot,
      done: { gameData: true },
      accessibleGuildIds: [],
      hasCharacterScope: true,
    });

    expect(plan.patches).toEqual([
      { domain: "timers", set: { hiddenTimers: ["a"] } },
      {
        domain: "appearance",
        set: { timers: { timersColors: { Tanroth: "red" } } },
      },
    ]);
  });

  it("skips domains already imported and timers that were never persisted locally", () => {
    markSettingsImportDone("timers");
    markSettingsImportDone("controls");

    const plan = planSettingsImport({
      documents: createSettingsDocuments(),
      local: { ...localSnapshot, timers: null },
      done: readSettingsImportState().done,
      accessibleGuildIds: [],
      hasCharacterScope: false,
    });

    expect(plan.patches).toEqual([
      { domain: "general", set: { allowWorldSelection: true } },
    ]);
    expect(plan.domains).toEqual(["general"]);
  });
});
