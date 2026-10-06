import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useNotifications } from "./use-notifications";
import { createNotificationTest } from "../notification-test";
import { useGameStore } from "@/store/game.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useSession } from "@/hooks/auth/use-session";

const ownReport = (
  notificationId: string,
  organizer?: { accountId: string; characterId: string },
) => ({
  v: 1 as const,
  type: "notification.sent" as const,
  data: {
    organizationId: "guild-1",
    payload: {
      notificationId,
      guildId: "guild-1",
      discordId: "own-discord-id",
      world: "luvia",
      createdAt: "2026-04-22T10:00:00.000Z",
      npc: {
        id: 500,
        name: "Hydra",
        lvl: 200,
        prof: "w",
        wt: 0,
        type: 2,
        location: "Swamp",
      },
      ...(organizer && {
        isGatheringParty: true,
        character: {
          ...organizer,
          nick: "Alt",
          lvl: 200,
          prof: "w",
          icon: "alt.gif",
        },
      }),
    },
  },
});

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
          world: "luvia",
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

  it("shows own reports only for gatherings organized on another Margonem account", async () => {
    const test = createNotificationTest();
    setTestRuntimeGame({ hero: { accountId: "1", characterId: "101" } });
    test.setPreferences();
    act(() => test.setSessionDiscordId("own-discord-id"));

    const view = renderHook(
      () => {
        useNotifications();

        return useSession().data?.user.discordId;
      },
      { wrapper: test.wrapper },
    );

    await waitFor(() => expect(view.result.current).toBe("own-discord-id"));
    test.open();
    await test.receive(
      ownReport("own-npc-report"),
      ownReport("current-character-gathering", {
        accountId: "1",
        characterId: "101",
      }),
      ownReport("other-character-gathering", {
        accountId: "1",
        characterId: "102",
      }),
      ownReport("other-account-gathering", {
        accountId: "2",
        characterId: "201",
      }),
    );
    await waitFor(() =>
      expect(useNotificationsStore.getState().notifications).toEqual([
        expect.objectContaining({
          notificationId: "other-account-gathering",
        }),
      ]),
    );
  });
});
