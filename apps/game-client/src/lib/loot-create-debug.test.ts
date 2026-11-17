import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import {
  LOOT_CREATE_DEBUG_PREFIX,
  logLootCreateDebug,
} from "./loot-create-debug";

describe("loot create debug logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);
  });

  it("does not write to the console when logging is disabled", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    logLootCreateDebug("event-detected", {
      attemptId: "attempt-1",
      source: "dialog",
    });

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it("omits map observations from diagnostics without changing the request", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    useSettingsStore.getState().setLootDebugLoggingEnabled(true);

    const payload = {
      source: "FIGHT",
      mapPlayersSnapshot: [{ name: "Observer" }],
    };

    logLootCreateDebug("request-prepared", { payload });

    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      stage: "request-prepared",
      payload: { source: "FIGHT" },
    });
    expect(payload.mapPlayersSnapshot).toEqual([{ name: "Observer" }]);
  });
});
