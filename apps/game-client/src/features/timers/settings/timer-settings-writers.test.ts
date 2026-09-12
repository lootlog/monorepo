import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUsersControllerGetUserPreferencesQueryKey } from "@lootlog/client/main";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import { queryClient } from "@/lib/query-client";
import {
  createSettingsDocuments,
  seedSettingsDocumentValues,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { seedGuildTimerLists } from "@/features/timers/model/timer-view-fixtures";
import {
  deleteCustomColor,
  hideDefaultColor,
  readGuildTimerLists,
  readTimerAppearance,
  readTimerBehavior,
  resetDefaultColor,
  setExpiredTimerAlwaysVisible,
  setTimerColor,
  setTimerHidden,
  setTimerPinned,
} from "./timer-settings-writers";

// The queue is the real boundary; only its enqueue side is observed so no
// request leaves the test. Optimistic cache updates still run.
const enqueue = vi.spyOn(settingsPatchQueue, "enqueue");

const operations = () => enqueue.mock.calls.map(([patch]) => patch.operation);

const userScope = { type: "USER", id: "user" } as const;

describe("timer settings writers", () => {
  beforeEach(() => {
    enqueue.mockClear();
    queryClient.clear();
    settingsPatchQueue.reset();
    queryClient.setQueryData(getUsersControllerGetUserPreferencesQueryKey(), {
      userId: "user",
      guildsOrder: [],
      hiddenGuildIds: [],
      theme: "default",
      chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
      mutes: { players: [], npcs: [] },
    });
    seedSettingsDocuments(queryClient, createSettingsDocuments());
    seedGuildTimerLists(queryClient, { "guild-1": {} });
  });

  afterEach(() => {
    settingsPatchQueue.reset();
    queryClient.clear();
  });

  it("writes guild lists to the organization document and the global list to the user document, deduplicated", () => {
    setTimerHidden("guild-1", "timer-1", true);
    setTimerHidden("guild-1", "timer-1", true);
    setTimerPinned("global", "timer-7", true);
    setTimerPinned("global", "timer-7", true);

    expect(readGuildTimerLists("guild-1").hiddenTimers).toEqual(["timer-1"]);
    expect(readGuildTimerLists("global").pinnedTimers).toEqual(["timer-7"]);
    expect(operations().map((operation) => operation.scope)).toEqual([
      { type: "GUILD", id: "guild-1" },
      { type: "GUILD", id: "guild-1" },
      userScope,
      userScope,
    ]);
    setTimerHidden("guild-1", "timer-1", false);
    expect(readGuildTimerLists("guild-1").hiddenTimers).toEqual([]);
  });

  it("clears a timer colour with an unset so no stale id survives on the server", () => {
    setTimerColor("Tanroth", "red");
    expect(readTimerAppearance().timersColors).toEqual({ Tanroth: "red" });
    setTimerColor("Tanroth", undefined);
    expect(readTimerAppearance().timersColors).toEqual({});
    expect(operations().at(-1)).toMatchObject({
      domain: "appearance",
      set: {},
      unset: ["timers.timersColors.Tanroth"],
    });
  });

  it("removes every assignment of a deleted custom colour and of a hidden stock colour in one operation", () => {
    seedSettingsDocumentValues(queryClient, {
      "appearance.timers.customColors": {
        "custom-1": {
          id: "custom-1",
          name: "Custom",
          borderColor: "#111",
          backgroundColor: "#222",
        },
      },
      "appearance.timers.timersColors": {
        Tanroth: "custom-1",
        Mushita: "red",
        Furruk: "custom-1",
      },
    });

    deleteCustomColor("custom-1");
    expect(readTimerAppearance().customColors).toEqual({});
    expect(readTimerAppearance().timersColors).toEqual({ Mushita: "red" });
    expect(operations().at(-1)?.unset).toEqual([
      "timers.customColors.custom-1",
      "timers.timersColors.Tanroth",
      "timers.timersColors.Furruk",
    ]);

    hideDefaultColor("red");
    expect(readTimerAppearance().hiddenDefaultColors).toEqual(["red"]);
    expect(readTimerAppearance().timersColors).toEqual({});
  });

  it("resets a stock colour's name and override together", () => {
    seedSettingsDocumentValues(queryClient, {
      "appearance.timers.defaultColorNames": { red: "Bossy" },
      "appearance.timers.overriddenDefaultColors": {
        red: { borderColor: "#1", backgroundColor: "#2" },
      },
    });

    resetDefaultColor("red");
    expect(readTimerAppearance().defaultColorNames).toEqual({});
    expect(readTimerAppearance().overriddenDefaultColors).toEqual({});
  });

  it("unsets an emptied always-visible world and invalidates timer lists after the save", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    setExpiredTimerAlwaysVisible("gefion", "123:boss", true);
    setExpiredTimerAlwaysVisible("gefion", "123:boss", true);
    expect(readTimerBehavior().alwaysVisibleExpiredTimers).toEqual({
      gefion: ["123:boss"],
    });
    setExpiredTimerAlwaysVisible("gefion", "123:boss", false);
    expect(readTimerBehavior().alwaysVisibleExpiredTimers).toEqual({});
    expect(operations().at(-1)).toMatchObject({
      domain: "timers",
      unset: ["alwaysVisibleExpiredTimers.gefion"],
    });
    const lastPatch = enqueue.mock.calls.at(-1)?.[0];
    lastPatch?.afterSave?.();
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) }),
    );
  });
});
