import { renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import {
  defaultDetectorSettings,
  defaultNotificationsSettings,
} from "@lootlog/schema/account-preferences";
import { createNotificationsSettings } from "@/lib/game-account-preferences";
import {
  createAccountPreferences,
  createAccountPreferencesTest,
} from "@/test/account-preferences-test";
import { useCurrentGameAccountPreferences } from "./use-current-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "./use-current-game-account-detector-settings";
import { useCurrentGameAccountNotificationSettings } from "./use-current-game-account-notification-settings";

it("keeps notifications unready while preferences are unavailable", () => {
  const fixture = createAccountPreferencesTest(
    () => new Promise<Response>(() => undefined),
  );

  const { result } = renderHook(
    () => useCurrentGameAccountNotificationSettings(),
    { wrapper: fixture.wrapper },
  );

  expect(result.current.accountId).toBe("202");
  expect(result.current.isReady).toBe(false);
  expect(result.current.settings).toEqual(defaultNotificationsSettings);
});

it("returns the shared account preference query", () => {
  const fixture = createAccountPreferencesTest();
  const preferences = createAccountPreferences();
  fixture.queryClient.setQueryData(fixture.queryKey, preferences);

  const { result } = renderHook(() => useCurrentGameAccountPreferences(), {
    wrapper: fixture.wrapper,
  });

  expect(result.current.accountId).toBe("202");
  expect(result.current.data).toEqual(preferences);
  expect(result.current.isFetching).toBe(false);
});

it("marks notifications ready after defaults are stored", () => {
  const fixture = createAccountPreferencesTest();
  fixture.queryClient.setQueryData(
    fixture.queryKey,
    createAccountPreferences({
      notifications: createNotificationsSettings(["guild-1"]),
      hasStoredNotifications: true,
    }),
  );

  const { result } = renderHook(
    () => useCurrentGameAccountNotificationSettings(),
    { wrapper: fixture.wrapper },
  );

  expect(result.current.isReady).toBe(true);
  expect(result.current.settings).toEqual(
    createNotificationsSettings(["guild-1"]),
  );
});

it("keeps detector settings unready until stored data or a failed query", () => {
  const fixture = createAccountPreferencesTest(
    () => new Promise<Response>(() => undefined),
  );

  const { result } = renderHook(() => useCurrentGameAccountDetectorSettings(), {
    wrapper: fixture.wrapper,
  });

  expect(result.current.accountId).toBe("202");
  expect(result.current.isReady).toBe(false);
  expect(result.current.settings).toEqual(defaultDetectorSettings);
});

it("uses detector defaults after an HTTP error", async () => {
  const fixture = createAccountPreferencesTest(() =>
    Response.json({ message: "unavailable" }, { status: 503 }),
  );

  const { result } = renderHook(() => useCurrentGameAccountDetectorSettings(), {
    wrapper: fixture.wrapper,
  });

  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.settings).toEqual(defaultDetectorSettings);
});
