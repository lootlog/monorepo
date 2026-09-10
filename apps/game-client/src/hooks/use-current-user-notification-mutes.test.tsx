import { renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { defaultNotificationMutes } from "@lootlog/schema/user-preferences";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { useGlobalStore } from "@/store/global.store";
import { useCurrentUserNotificationMutes } from "./use-current-user-notification-mutes";

const setup = () => {
  useGlobalStore.setState({
    gameState: {
      ...useGlobalStore.getState().gameState,
      gameInitialized: true,
    },
  });

  return createGuildPreferencesTest();
};

it("returns default mutes while preferences are unavailable", () => {
  const fixture = setup();
  fixture.queryClient.removeQueries({ queryKey: fixture.preferencesKey });
  fixture.request.mockImplementation(
    () => new Promise<Response>(() => undefined),
  );

  const { result } = renderHook(() => useCurrentUserNotificationMutes(), {
    wrapper: fixture.wrapper,
  });

  expect(result.current.isReady).toBe(false);
  expect(result.current.mutes).toEqual(defaultNotificationMutes);
});

it("marks the hook ready after the request completes", async () => {
  const fixture = setup();
  fixture.queryClient.removeQueries({ queryKey: fixture.preferencesKey });
  fixture.request.mockImplementation(() =>
    Promise.resolve(Response.json({ message: "unavailable" }, { status: 400 })),
  );

  const { result } = renderHook(() => useCurrentUserNotificationMutes(), {
    wrapper: fixture.wrapper,
  });

  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.mutes).toEqual(defaultNotificationMutes);
});

it("keeps effective mutes stable while query data is unchanged", () => {
  const fixture = setup();
  fixture.setPreferences({
    mutes: {
      players: [{ discordId: "discord-1", displayName: "Tester" }],
      npcs: [],
    },
  });

  const { result, rerender } = renderHook(
    () => useCurrentUserNotificationMutes(),
    { wrapper: fixture.wrapper },
  );

  const first = result.current.mutes;
  rerender();
  expect(result.current.mutes).toBe(first);
  expect(first.players).toEqual([
    { discordId: "discord-1", displayName: "Tester" },
  ]);
});
