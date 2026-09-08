import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useNotifications } from "./use-notifications";
import { createNotificationTest } from "../notification-test";
import { useGameStore } from "@/store/game.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

describe("useNotifications", () => {
  it("keeps queued notifications across startup account detection", async () => {
    const test = createNotificationTest();
    useGameStore.setState({ game: null });
    test.preferences.hasStoredNotifications = false;
    test.setPreferences();
    renderHook(() => useNotifications(), { wrapper: test.wrapper });
    test.open();
    await test.receive({
      v: 1,
      type: "notification.sent",
      data: {
        organizationId: "guild-1",
        payload: {
          notificationId: "notification-1",
          guildId: "guild-1",
          discordId: "other-discord-id",
          world: "pandora",
          createdAt: "2026-04-22T10:00:00.000Z",
          message: "test message",
        },
      },
    });
    act(() => setTestRuntimeGame({ hero: { accountId: "1" } }));
    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
    await act(() => {
      test.preferences.hasStoredNotifications = true;
      test.setPreferences();
    });
    await waitFor(() =>
      expect(useNotificationsStore.getState().notifications).toEqual([
        expect.objectContaining({
          notificationId: "notification-1",
          servers: ["guild-1"],
        }),
      ]),
    );
  });
});
