import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_DOMAINS } from "@lootlog/schema/settings-documents";
import { getUsersControllerGetUserPreferencesUrl } from "@lootlog/client/main";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import {
  createSettingsDocuments,
  readSeededSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { useGlobalStore } from "@/store/global.store";
import { markSettingsImportDone } from "./settings-import";
import { settingsPatchQueue } from "./settings-patch-client";
import { useSettingsHydration } from "./use-settings-hydration";

type Harness = ReturnType<typeof createGuildPreferencesTest>;

const patchBodies: string[] = [];

const respond = (harness: Harness) =>
  harness.request.mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));

    if (url.pathname === getUsersControllerGetUserPreferencesUrl()) {
      return Promise.resolve(
        Response.json(harness.queryClient.getQueryData(harness.preferencesKey)),
      );
    }

    if (url.pathname === "/preferences/guilds") {
      const guildIds = url.searchParams.get("guildIds")?.split(",") ?? [];

      return Promise.resolve(
        Response.json({
          guilds: Object.fromEntries(
            guildIds.map((guildId) => [
              guildId,
              createSettingsDocuments(
                { "timers.hiddenTimers": [`hidden-${guildId}`] },
                { type: "GUILD", id: guildId },
              ),
            ]),
          ),
        }),
      );
    }

    if (url.pathname !== "/preferences") {
      throw new Error(`Unexpected HTTP request: ${url.pathname}`);
    }

    if (init?.method === "PATCH") {
      patchBodies.push(String(init.body));

      return Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      );
    }

    return Promise.resolve(
      Response.json(readSeededSettingsDocuments(harness.queryClient)),
    );
  });

describe("useSettingsHydration", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createGuildPreferencesTest();
    patchBodies.length = 0;
    settingsPatchQueue.reset();
    setTestRuntimeGame();
    useGlobalStore.setState({ gameState: { gameInitialized: true } });

    for (const domain of SETTINGS_DOMAINS) markSettingsImportDone(domain);
    respond(harness);
  });

  it("seeds notification and detector defaults once per account and releases queued detections", async () => {
    const flushPending = vi
      .spyOn(npcsDetectionProcessor, "flushPending")
      .mockImplementation(() => {});

    seedSettingsDocuments(harness.queryClient, createSettingsDocuments());

    const view = renderHook(() => useSettingsHydration(), {
      wrapper: harness.wrapper,
    });

    await waitFor(() => expect(patchBodies).toHaveLength(1));
    view.rerender();
    await new Promise((resolve) => setTimeout(resolve, 350));

    const operations = JSON.parse(patchBodies[0] ?? "{}").operations;

    expect(operations).toEqual([
      expect.objectContaining({
        domain: "notifications",
        scope: { type: "GAME_ACCOUNT", id: "202" },
        set: {
          presentation: expect.objectContaining({
            guildIds: ["guild-1", "guild-2", "guild-3"],
          }),
        },
      }),
      expect.objectContaining({
        domain: "gameData",
        scope: { type: "GAME_ACCOUNT", id: "202" },
        set: { detector: expect.objectContaining({ routingRules: [] }) },
      }),
    ]);
    expect(patchBodies).toHaveLength(1);
    expect(flushPending).toHaveBeenCalledWith("202");
    flushPending.mockRestore();
  });
});
