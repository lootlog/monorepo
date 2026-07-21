import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useChatStore } from "@/store/chat.store";
import { useFriendsStore } from "@/store/friends.store";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import {
  debouncedSyncGlobalSettings,
  registerGlobalSettingsMutation,
} from "@/store/timer-settings-sync";
import { resetTransientRuntimeState } from "./runtime-state";

describe("resetTransientRuntimeState", () => {
  beforeEach(() => {
    resetTransientRuntimeState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears transient account, game, tooltip, notification and ready-room state", () => {
    useGlobalStore.setState({
      gameState: { gameInitialized: true },
      socketState: { connected: true, joined: true, joinedGuilds: ["guild"] },
    });
    useNpcDetectorStore.setState({
      npcs: [{ id: 1 }] as never,
    });
    useOthersStore.setState({ othersById: { 1: {} as never } });
    useFriendsStore.setState({ friendsMax: 50 });
    useNotificationsStore.setState({
      notifications: [{ notificationId: "notification" }] as never,
    });
    usePartyFinderStore.setState({
      readyRoomsSynchronized: true,
      roomVersions: {
        room: {
          observedAtMs: Date.now(),
          observedSequence: 1,
          presence: "REMOVED",
          revision: 1,
        },
      },
    });
    useCharacterTooltipCatchingGuildsStore.setState({
      entriesByKey: {
        character: {
          guilds: [],
          lastAccessedAt: Date.now(),
          status: "success",
        },
      },
    });
    useChatStore.getState().setReplyDraft({
      guildId: "guild",
      message: "message",
      messageId: "message-id",
      senderNick: "Hero",
      type: "NORMAL",
    });

    resetTransientRuntimeState();

    expect(useGlobalStore.getState().gameState.gameInitialized).toBe(false);
    expect(useGlobalStore.getState().socketState).toEqual({
      connected: false,
      joined: false,
      joinedGuilds: [],
    });
    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
    expect(useOthersStore.getState().othersById).toEqual({});
    expect(useFriendsStore.getState().friendsMax).toBe(0);
    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(useChatStore.getState().replyDraft).toBeNull();
    expect(usePartyFinderStore.getState().roomVersions).toEqual({});
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().entriesByKey,
    ).toEqual({});
  });

  it("cancels pending timer settings mutations during runtime teardown", () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    const unregister = registerGlobalSettingsMutation(mutate);
    debouncedSyncGlobalSettings({ syncEnabled: true });

    resetTransientRuntimeState();
    vi.advanceTimersByTime(500);
    unregister();

    expect(mutate).not.toHaveBeenCalled();
  });
});
