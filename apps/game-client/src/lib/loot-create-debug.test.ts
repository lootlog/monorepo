import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import {
  LOOT_CREATE_DEBUG_PREFIX,
  createLootDebugContext,
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

  it("writes structured lifecycle details when logging is enabled", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);

    logLootCreateDebug("request-prepared", {
      attemptId: "attempt-1",
      payload: { source: "DIALOG" },
      source: "dialog",
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "attempt-1",
      payload: { source: "DIALOG" },
      source: "dialog",
      stage: "request-prepared",
    });
  });

  it("creates a correlation context for a loot attempt", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );

    expect(createLootDebugContext("fight")).toEqual({
      attemptId: "00000000-0000-4000-8000-000000000001",
      source: "fight",
    });
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
