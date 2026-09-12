import { createNotificationsResponse } from "@/test/game-account-preferences-fixtures";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  type UserGameAccountPreferencesResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import {
  accountPreferenceValues,
  createSettingsDocuments,
  seedSettingsDocuments,
  userPreferenceValues,
} from "@/test/settings-documents-fixtures";
import { createRealtimeTest } from "@/test/realtime-test";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import { useGameStore } from "@/store/game.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { usePartyGatheringSocket } from "./use-party-gathering-socket";

const notification = (index: number) => ({
  v: 1 as const,
  type: "party-gathering.updated" as const,
  data: {
    organizationId: "guild-1",
    payload: {
      notificationId: `notification-${index}`,
      guildId: "guild-1",
      discordId: `discord-${index}`,
      world: "pandora",
      createdAt: "2026-04-17T10:00:00.000Z",
      character: {
        nick: `Hero ${index}`,
        lvl: 100,
        prof: "w",
        characterId: `${index}`,
        accountId: `${index}`,
        icon: "hero.gif",
      },
    },
  },
});

const prepare = () => {
  const test = createRealtimeTest();
  useGameStore.setState({ game: null });
  const settings = createNotificationsResponse(["guild-1"]);
  settings["party-gathering"].sound = false;

  const preferences: UserGameAccountPreferencesResponseDtoOutput = {
    accountId: "202",
    notifications: settings,
    detector: createDetectorSettings(),
    pings: { enabled: true },
    airTags: { enabled: true },
    hasStoredNotifications: true,
    hasStoredDetector: true,
    hasStoredPings: true,
    hasStoredAirTags: true,
    hasStoredPreferences: true,
  };

  const ready = async (mutedDiscordIds: string[] = []) => {
    await act(() => {
      setTestRuntimeGame({ hero: { accountId: "202" } });
      seedSettingsDocuments(
        test.queryClient,
        createSettingsDocuments({
          ...accountPreferenceValues(preferences),
          ...userPreferenceValues({
            mutes: {
              players: mutedDiscordIds.map((discordId) => ({
                discordId,
                displayName: discordId,
              })),
              npcs: [],
            },
          }),
        }),
      );
      test.queryClient.setQueryData<UserPreferencesResponseDtoOutput>(
        getUsersControllerGetUserPreferencesQueryKey(),
        {
          userId: "user",
          guildsOrder: [],
          hiddenGuildIds: [],
          theme: "dark",
          chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
          mutes: {
            players: mutedDiscordIds.map((discordId) => ({
              discordId,
              displayName: discordId,
            })),
            npcs: [],
          },
        },
      );
    });
  };

  return { ...test, ready };
};

describe("usePartyGatheringSocket", () => {
  it("keeps queued notifications across startup account detection", async () => {
    const test = prepare();
    renderHook(() => usePartyGatheringSocket(), { wrapper: test.wrapper });
    test.open();
    await test.receive(notification(1));
    act(() => setTestRuntimeGame({ hero: { accountId: "202" } }));
    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
    await test.ready();
    await waitFor(() =>
      expect(useNotificationsStore.getState().notifications).toEqual([
        expect.objectContaining({
          notificationId: "notification-1",
          servers: ["guild-1"],
          type: "party-gathering",
        }),
      ]),
    );
  });
  it("caps queued notifications before readiness", async () => {
    const test = prepare();
    renderHook(() => usePartyGatheringSocket(), { wrapper: test.wrapper });
    test.open();
    await test.receive(
      ...Array.from({ length: 105 }, (_, index) => notification(index)),
    );
    // Hide the newest 55 after ingress so the presentation store's independent
    // 50-item cap cannot mask whether ingress dropped the oldest five.
    await test.ready(
      Array.from({ length: 55 }, (_, index) => `discord-${index + 50}`),
    );
    await waitFor(() =>
      expect(useNotificationsStore.getState().notifications).toHaveLength(45),
    );
    expect(useNotificationsStore.getState().notifications).not.toContainEqual(
      expect.objectContaining({ notificationId: "notification-0" }),
    );
    expect(useNotificationsStore.getState().notifications).toContainEqual(
      expect.objectContaining({ notificationId: "notification-49" }),
    );
  });
  it("drops queued notifications cancelled before readiness", async () => {
    const test = prepare();
    renderHook(() => usePartyGatheringSocket(), { wrapper: test.wrapper });
    test.open();
    await test.receive(notification(1), {
      v: 1,
      type: "party-gathering.cancelled",
      data: {
        organizationId: "guild-1",
        payload: { notificationId: "notification-1" },
      },
    });
    await test.ready();
    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
  });
});
