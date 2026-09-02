import type { SettingsDocumentsResponse } from "#src/settings-documents/settings-documents.service";
import { describe, expect, it, vi } from "#test/bun-test";
import { TimerSettingsService } from "./timer-settings.service.js";

const createResponse = (
  appearance: Record<string, unknown> = {},
  timers: Record<string, unknown> = {},
): SettingsDocumentsResponse => ({
  domains: {
    appearance: {
      effective: appearance,
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
    timers: {
      effective: timers,
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
});

describe("TimerSettingsService", () => {
  it("combines appearance and behavior documents for the legacy response", async () => {
    const settingsDocumentsService = {
      getPreferences: vi.fn().mockResolvedValue(
        createResponse(
          {
            timers: {
              displayConfig: { fontSize: 14 },
              hiddenDefaultColors: ["legacy"],
            },
          },
          {
            generalConfig: { countdownMode: "min" },
            timerFiltersEnabled: true,
            colorFiltersEnabled: false,
            timersSortOrder: "desc",
            syncEnabled: true,
          },
        ),
      ),
    };
    const service = new TimerSettingsService(settingsDocumentsService as never);

    await expect(service.getGlobalSettings("user-1")).resolves.toMatchObject({
      userId: "user-1",
      displayConfig: { fontSize: 14 },
      hiddenDefaultColors: ["legacy"],
      generalConfig: { countdownMode: "min" },
      timersSortOrder: "desc",
    });
  });

  it("patches appearance and behavior atomically", async () => {
    const response = createResponse();
    const settingsDocumentsService = {
      patchPreferences: vi.fn().mockResolvedValue(response),
    };
    const service = new TimerSettingsService(settingsDocumentsService as never);

    await service.updateGlobalSettings("user-1", {
      displayConfig: { fontSize: 13 },
      timerFiltersEnabled: false,
    });

    expect(settingsDocumentsService.patchPreferences).toHaveBeenCalledWith(
      "user-1",
      {
        operations: [
          {
            domain: "appearance",
            scope: { type: "USER", id: "user-1" },
            set: { timers: { displayConfig: { fontSize: 13 } } },
            unset: [],
          },
          {
            domain: "timers",
            scope: { type: "USER", id: "user-1" },
            set: { timerFiltersEnabled: false },
            unset: [],
          },
        ],
      },
    );
  });

  it("uses a private guild layer for hidden and pinned timers", async () => {
    const settingsDocumentsService = {
      patchPreferences: vi
        .fn()
        .mockResolvedValue(
          createResponse({}, { hiddenTimers: ["timer-1"], pinnedTimers: [] }),
        ),
    };
    const service = new TimerSettingsService(settingsDocumentsService as never);

    await service.updateGuildSettings("user-1", "guild-1", {
      hiddenTimers: ["timer-1"],
    });

    expect(settingsDocumentsService.patchPreferences).toHaveBeenCalledWith(
      "user-1",
      {
        operations: [
          {
            domain: "timers",
            scope: { type: "GUILD", id: "guild-1" },
            set: { hiddenTimers: ["timer-1"] },
            unset: [],
          },
        ],
      },
    );
  });
});
