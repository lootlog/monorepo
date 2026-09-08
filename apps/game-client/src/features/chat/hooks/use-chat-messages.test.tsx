import {
  act,
  render as renderUi,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/client/main";
import type { ChatMessage } from "@/api/chat.api";
import { authClient } from "@/lib/auth-client";
import { useGameStore } from "@/store/game.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { createRealtimeTest } from "@/test/realtime-test";
import { createChatMember, createChatMessage } from "../chat-test-fixtures";
import { useChatMessagesListener } from "./use-chat-messages";

const key = (guildId = "guild-1") =>
  getChatControllerGetChatMessagesQueryKey({ guildId });
const message = (
  id: string,
  guildId = "guild-1",
  overrides: Partial<ChatMessage> = {},
) =>
  createChatMessage({
    id,
    guildId,
    senderId: `sender-${id}`,
    message: `Message ${id}`,
    ...overrides,
  });
const created = (message: ChatMessage): ServerEvent => ({
  v: 1,
  type: "chat.created",
  data: { organizationId: message.guildId, payload: message },
});
const legacyPermissions = (organizationIds = ["guild-1"]): ServerEvent => ({
  v: 1,
  type: "permissions.updated",
  data: { organizationIds, subscriptionScopes: [] },
});
const ChatListener = () => {
  useChatMessagesListener();
  return null;
};
const notifications = () => useNotificationsStore.getState().notifications;

describe("useChatMessagesListener", () => {
  let harness: ReturnType<typeof createRealtimeTest>;
  let frameCallbacks: Map<number, FrameRequestCallback>;
  beforeEach(() => {
    harness = createRealtimeTest();
    frameCallbacks = new Map();
    let nextFrameId = 1;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frameCallbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) =>
      frameCallbacks.delete(id),
    );
    harness.queryClient.setQueryData(key(), []);
    harness.queryClient.setQueryData(key("guild-2"), []);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  const mount = (options?: Parameters<typeof useChatMessagesListener>[0]) => {
    const result = renderHook(() => useChatMessagesListener(options), {
      wrapper: harness.wrapper,
    });
    harness.open();
    return result;
  };
  const flushFrame = () =>
    act(() => {
      const callbacks = [...frameCallbacks.values()];
      frameCallbacks.clear();
      callbacks.forEach((callback) => callback(0));
    });
  const cached = (guildId = "guild-1") =>
    harness.queryClient.getQueryData<ChatMessage[]>(key(guildId));
  const loseAccount = () =>
    act(() => {
      const game = useGameStore.getState().game;
      if (!game) throw new Error("Expected game");
      useGameStore.getState().replaceGame({
        ...game,
        hero: { ...game.hero, accountId: "other-account" },
      });
    });

  it("discards queued chat messages after permission changes", async () => {
    mount();
    await harness.receive(
      created(message("hidden-titan")),
      legacyPermissions(),
    );
    flushFrame();
    expect(cached()).toEqual([]);
  });

  it("refetches active chat histories only after the reconnected session joins", async () => {
    const fetchHistory = vi
      .fn<() => Promise<ChatMessage[]>>()
      .mockResolvedValue([]);
    const observer = new QueryObserver(harness.queryClient, {
      queryKey: key(),
      queryFn: fetchHistory,
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    mount();
    expect(fetchHistory).not.toHaveBeenCalled();
    await harness.join();
    await waitFor(() => expect(fetchHistory).toHaveBeenCalledOnce());
    unsubscribe();
  });

  it("removes cached chat histories after losing a guild", async () => {
    mount();
    await harness.join(["guild-1", "guild-2"]);
    harness.queryClient.setQueryData(["unrelated"], "kept");
    await harness.join(["guild-1"]);
    expect(cached("guild-2")).toBeUndefined();
    expect(cached()).toEqual([]);
    expect(harness.queryClient.getQueryData(["unrelated"])).toBe("kept");
  });

  it("removes every cached chat history after changing the game account", () => {
    mount();
    harness.queryClient.setQueryData(["unrelated"], "kept");
    loseAccount();
    expect(cached()).toBeUndefined();
    expect(cached("guild-2")).toBeUndefined();
    expect(harness.queryClient.getQueryData(["unrelated"])).toBe("kept");
  });

  it.each([false, true])(
    "clears cached history and queued messages on session logout (queued: %s)",
    async (queued) => {
      const { result } = renderHook(
        () => {
          useChatMessagesListener();
          return authClient.useSession().data;
        },
        { wrapper: harness.wrapper },
      );
      harness.open();
      act(() => harness.setSessionDiscordId("current-discord"));
      await waitFor(() =>
        expect(result.current?.user.discordId).toBe("current-discord"),
      );
      harness.queryClient.setQueryData(key(), [message("old-session")]);
      harness.queryClient.setQueryData(["unrelated"], "kept");
      if (queued) await harness.receive(created(message("queued-session")));
      act(() => harness.setSessionDiscordId(null));
      await waitFor(() => expect(result.current).toBeNull());
      flushFrame();
      expect(cached()).toBeUndefined();
      expect(harness.queryClient.getQueryData(["unrelated"])).toBe("kept");
    },
  );

  it.each([false, true])(
    "prefetches missing member data only for a visible chat: %s",
    async (prefetchMembers) => {
      mount({ prefetchMembers });
      await harness.receive(created(message("visibility")));
      expect(
        harness.requests.filter((url) => url.endsWith("/members/summary")),
      ).toHaveLength(prefetchMembers ? 1 : 0);
    },
  );

  it("does not present a mention resolved after permissions changed", async () => {
    const response = Promise.withResolvers<Response>();
    harness.memberRequest.mockReturnValue(response.promise);
    mount();
    await harness.receive(
      created(
        message("hidden-titan", "guild-1", { message: "Hej @Current Hero" }),
      ),
    );
    await waitFor(() => expect(harness.memberRequest).toHaveBeenCalledOnce());
    await harness.receive(legacyPermissions());
    await act(async () => {
      response.resolve(Response.json(createChatMember()));
      await response.promise;
    });
    expect(notifications()).toEqual([]);
  });

  it("restricts pending messages and asynchronous mentions only in the affected organization", async () => {
    const response = Promise.withResolvers<Response>();
    harness.memberRequest.mockReturnValue(response.promise);
    mount();
    const policy = createAccessPolicySnapshot(
      ["guild-1", "guild-2"].map((id) => ({
        guild: { id, ownerId: "owner" },
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_READ],
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
          },
        ],
      })),
      "user",
    );
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1", "guild-2"],
        subscriptionScopes: [],
        accessPolicy: policy,
      },
    });
    await harness.receive(
      created(
        message("unaffected", "guild-2", { message: "Hej @Current Hero" }),
      ),
      created(message("revoked")),
    );
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1", "guild-2"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "guild-2", ownerId: "owner" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_CHAT_READ],
                  lvlRangeFrom: 0,
                  lvlRangeTo: 500,
                },
              ],
            },
          ],
          "user",
        ),
      },
    });
    flushFrame();
    expect(cached()?.map((row) => row.id) ?? []).toEqual([]);
    expect(cached("guild-2")?.map((row) => row.id)).toEqual(["unaffected"]);
    response.resolve(Response.json(createChatMember()));
    await waitFor(() => expect(notifications()).toHaveLength(1));
  });

  it.each(["NPC", "NORMAL"] as const)(
    "preserves the source classification on a %s mention",
    async (type) => {
      mount();
      await harness.receive(
        created(
          message("mention", "guild-1", {
            type,
            message: "Hej @Current Hero",
            npc:
              type === "NPC"
                ? {
                    id: 1,
                    name: "Titan",
                    icon: "npc.gif",
                    location: "Map",
                    type: 3,
                    wt: 100,
                    prof: "w",
                    lvl: 300,
                  }
                : undefined,
          }),
        ),
      );
      await waitFor(() => expect(notifications()).toHaveLength(1));
      expect(notifications()[0]).toMatchObject({
        type: "chat-mention",
        sourceNpc: type === "NPC" ? { type: "TITAN", lvl: 300 } : null,
      });
    },
  );

  it("presents a matching chat mention through the notification pipeline", async () => {
    mount();
    await harness.receive(
      created(
        message("message-1", "guild-1", { message: "Hej @Current Hero" }),
      ),
    );
    await waitFor(() => expect(notifications()).toHaveLength(1));
    expect(notifications()[0]).toMatchObject({
      type: "chat-mention",
      notificationId: "chat-mention:guild-1:message-1",
      servers: ["guild-1"],
    });
  });

  it("does not rerender when only hero coordinates change", () => {
    let renders = 0;
    renderHook(
      () => {
        renders += 1;
        useChatMessagesListener();
      },
      { wrapper: harness.wrapper },
    );
    const before = renders;
    const game = useGameStore.getState().game;
    if (!game) throw new Error("Expected game");
    act(() =>
      useGameStore
        .getState()
        .replaceGame({ ...game, hero: { ...game.hero, x: game.hero.x + 1 } }),
    );
    expect(renders).toBe(before);
  });

  it("publishes a fifteen-message burst to one guild cache once per frame", async () => {
    const onRemoteMessage = vi.fn<(message: ChatMessage) => void>();
    mount({ onRemoteMessage });
    let updates = 0;
    const unsubscribe = harness.queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (
          event.type === "updated" &&
          event.query.queryKey[0] === key()[0] &&
          event.action.type === "success"
        )
          updates++;
      });
    await harness.receive(
      ...Array.from({ length: 15 }, (_, index) =>
        created(message(String(index))),
      ),
    );
    expect(cached()).toEqual([]);
    expect(onRemoteMessage).not.toHaveBeenCalled();
    flushFrame();
    expect(updates).toBe(1);
    expect(onRemoteMessage).toHaveBeenCalledTimes(15);
    expect(cached()?.map((row) => row.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => String(index)),
    );
    unsubscribe();
  });

  it("folds create, update, delete, and clear operations in receive order", async () => {
    mount();
    harness.queryClient.setQueryData(key(), [message("existing")]);
    await harness.receive(
      created(message("created")),
      {
        v: 1,
        type: "chat.updated",
        data: {
          organizationId: "guild-1",
          payload: {
            guildId: "guild-1",
            messageId: "created",
            message: "Edited",
          },
        },
      },
      {
        v: 1,
        type: "chat.deleted",
        data: {
          organizationId: "guild-1",
          payload: { guildId: "guild-1", messageId: "created" },
        },
      },
      {
        v: 1,
        type: "chat.cleared",
        data: { organizationId: "guild-1", payload: { guildId: "guild-1" } },
      },
      created(message("after-clear")),
    );
    flushFrame();
    expect(cached()).toEqual([message("after-clear")]);
  });

  it("publishes each organization at most once in the same frame", async () => {
    mount();
    const updates: string[] = [];
    const unsubscribe = harness.queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (
          event.type === "updated" &&
          event.action.type === "success" &&
          [key()[0], key("guild-2")[0]].some(
            (path) => path === event.query.queryKey[0],
          )
        )
          updates.push(event.query.queryHash);
      });
    await harness.receive(
      ...[
        message("1a"),
        message("2a", "guild-2"),
        message("1b"),
        message("2b", "guild-2"),
      ].map(created),
    );
    flushFrame();
    expect(updates).toHaveLength(2);
    expect(cached()?.map((row) => row.id)).toEqual(["1a", "1b"]);
    expect(cached("guild-2")?.map((row) => row.id)).toEqual(["2a", "2b"]);
    unsubscribe();
  });

  it("flushes through the safety timeout when animation frames are paused", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frameCallbacks.set(1, callback);
      return 1;
    });
    mount();
    await harness.receive(created(message("background")));
    act(() => vi.advanceTimersByTime(49));
    expect(cached()).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(cached()).toEqual([message("background")]);
  });

  it("flushes accepted operations during ordinary cleanup", async () => {
    const { rerender } = renderUi(<ChatListener />, {
      wrapper: harness.wrapper,
    });
    harness.open();
    await harness.receive(created(message("before-unmount")));
    expect(cached()).toEqual([]);
    rerender(<></>);
    expect(cached()).toEqual([message("before-unmount")]);
  });

  it("discards pending operations before removing caches on account change", async () => {
    mount();
    await harness.receive(created(message("old-account")));
    loseAccount();
    flushFrame();
    expect(cached()).toBeUndefined();
  });

  it("drops pending operations for a guild before removing its cache", async () => {
    mount();
    const policy = (ids: string[]) =>
      createAccessPolicySnapshot(
        ids.map((id) => ({
          guild: { id, ownerId: "owner" },
          roles: [
            {
              permissions: [Permission.LOOTLOG_CHAT_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: 500,
            },
          ],
        })),
        "user",
      );
    await harness.join(["guild-1", "guild-2"], policy(["guild-1", "guild-2"]));
    await harness.receive(
      created(message("kept")),
      created(message("dropped", "guild-2")),
    );
    await harness.join(["guild-1"], policy(["guild-1"]));
    flushFrame();
    expect(cached()).toEqual([message("kept")]);
    expect(cached("guild-2")).toBeUndefined();
  });

  it("keeps accepted messages across a socket reconnect", async () => {
    mount();
    const policy = createAccessPolicySnapshot(
      [
        {
          guild: { id: "guild-1", ownerId: "owner" },
          roles: [
            {
              permissions: [Permission.LOOTLOG_CHAT_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: 500,
            },
          ],
        },
      ],
      "user",
    );
    await harness.join(["guild-1"], policy);
    await harness.receive(created(message("during-reconnect")));
    flushFrame();
    act(() => {
      harness.realtime.disconnect();
      harness.realtime.connect();
    });
    harness.open();
    await harness.join(["guild-1"], policy);
    expect(cached()).toEqual([message("during-reconnect")]);
  });
});
