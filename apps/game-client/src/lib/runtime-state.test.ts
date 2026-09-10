import { seedRuntimeOthers } from "@/test/runtime-other-fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useChatStore } from "@/store/chat.store";
import { useFriendsStore } from "@/store/friends.store";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useOthersStore } from "@/store/others.store";
import { useNpcsStore } from "@/store/npcs.store";
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
      npcs: [
        {
          id: 1,
          nick: "NPC",
          icon: "npc.gif",
          lvl: 200,
          prof: "w",
          type: 2,
          wt: 80,
          tpl: 1,
          x: 1,
          y: 2,
          location: "Ithan",
          notificationSent: false,
        },
      ],
    });
    seedRuntimeOthers({
      "1": {
        d: {
          id: "1",
          nick: "Other",
          account: 1,
          icon: "other.gif",
          lvl: 200,
          prof: "w",
          x: 1,
          y: 2,
        },
      },
    });
    useNpcsStore.setState({
      npcsById: {
        1: {
          id: 1,
          name: "NPC",
          icon: "npc.gif",
          level: 200,
          profession: "w",
          type: 2,
          weight: 80,
          templateId: 1,
          x: 1,
          y: 2,
        },
      },
    });
    useFriendsStore.setState({ friendsMax: 50 });
    useNotificationsStore.setState({
      notifications: [
        {
          notificationId: "notification",
          discordId: "discord-1",
          guildId: "guild",
          world: "fobos",
          createdAt: "2026-01-01T00:00:00.000Z",
          message: "Hello",
          servers: ["guild"],
          listKey: "notification",
          receivedAtMs: Date.now(),
        },
      ],
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
    expect(useNpcsStore.getState().npcsById).toEqual({});
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

    const mutate =
      vi.fn<Parameters<typeof registerGlobalSettingsMutation>[0]>();

    const unregister = registerGlobalSettingsMutation(mutate);
    debouncedSyncGlobalSettings({ syncEnabled: true });

    resetTransientRuntimeState();
    vi.advanceTimersByTime(500);
    unregister();

    expect(mutate).not.toHaveBeenCalled();
  });
});
