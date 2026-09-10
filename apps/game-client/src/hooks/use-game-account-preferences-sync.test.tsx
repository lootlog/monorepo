import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import {
  createAccountPreferences,
  createAccountPreferencesTest,
} from "@/test/account-preferences-test";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useGameAccountPreferencesSync } from "./use-game-account-preferences-sync";

const queueNpc = () =>
  npcsDetectionProcessor.handle({
    npcs: [{ id: 500, tpl: 900, x: 12, y: 18, icon: { id: 44 } }],
    npc_tpls: [
      {
        id: 900,
        nick: "Tanroth",
        prof: "w",
        type: 2,
        warrior_type: 85,
        level: 120,
        resp_rand: 10,
      },
    ],
    icons: [{ id: 44, icon: "npc.gif" }],
  });

it("stores defaults for accessible organizations when server settings are missing", async () => {
  const fixture = createAccountPreferencesTest();
  fixture.queryClient.setQueryData(
    fixture.queryKey,
    createAccountPreferences(),
  );
  renderHook(() => useGameAccountPreferencesSync(), {
    wrapper: fixture.wrapper,
  });
  await waitFor(() =>
    expect(
      fixture.requests.filter((request) => request.method !== "GET"),
    ).toHaveLength(1),
  );
  expect(
    await fixture.requests
      .filter((request) => request.method !== "GET")[0]
      .json(),
  ).toEqual({
    notifications: createNotificationsSettings(["guild-1", "guild-2"]),
    detector: createDetectorSettings(),
  });
  expect(fixture.queryClient.getQueryData(fixture.queryKey)).toMatchObject({
    accountId: "202",
    notifications: createNotificationsSettings(["guild-1", "guild-2"]),
    hasStoredNotifications: true,
    hasStoredDetector: true,
    hasStoredPreferences: true,
  });
});

it("waits for organization membership before storing defaults", () => {
  const fixture = createAccountPreferencesTest(
    () => new Promise<Response>(() => undefined),
  );

  fixture.queryClient.removeQueries({ queryKey: fixture.guildsKey });
  const preferences = createAccountPreferences();
  fixture.queryClient.setQueryData(fixture.queryKey, preferences);
  renderHook(() => useGameAccountPreferencesSync(), {
    wrapper: fixture.wrapper,
  });
  expect(
    fixture.requests.filter((request) => request.method !== "GET"),
  ).toHaveLength(0);
  expect(fixture.queryClient.getQueryData(fixture.queryKey)).toEqual(
    preferences,
  );
});

it("flushes queued NPC detection once the preference request fails", async () => {
  const pending = Promise.withResolvers<Response>();
  const fixture = createAccountPreferencesTest(() => pending.promise);
  queueNpc();
  expect(useNpcDetectorStore.getState().npcs).toHaveLength(0);
  renderHook(() => useGameAccountPreferencesSync(), {
    wrapper: fixture.wrapper,
  });
  await act(async () => {
    pending.resolve(Response.json({ message: "unavailable" }, { status: 503 }));
    await pending.promise;
  });
  await waitFor(() =>
    expect(useNpcDetectorStore.getState().npcs.map((npc) => npc.id)).toContain(
      500,
    ),
  );
});

it("fetches and flushes queued detection after runtime account identity becomes available", async () => {
  const fixture = createAccountPreferencesTest(() =>
    Response.json({ message: "unavailable" }, { status: 503 }),
  );

  queueNpc();
  useGameStore.getState().clearGame();
  renderHook(() => useGameAccountPreferencesSync(), {
    wrapper: fixture.wrapper,
  });
  expect(fixture.requests).toHaveLength(0);
  expect(useNpcDetectorStore.getState().npcs).toHaveLength(0);
  act(() => setTestRuntimeGame());
  await waitFor(() =>
    expect(useNpcDetectorStore.getState().npcs.map((npc) => npc.id)).toContain(
      500,
    ),
  );
  expect(fixture.requests).toHaveLength(1);
});
