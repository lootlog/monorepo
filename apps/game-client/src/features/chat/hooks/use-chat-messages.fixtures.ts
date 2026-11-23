import { ownerAccessPolicy } from "@/test/realtime-wire";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/client/main";
import type { ChatMessage } from "@/api/chat.api";
import { useGameStore } from "@/store/game.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { createRealtimeTest } from "@/test/realtime-test";
import { createChatMessage } from "@/test/chat-fixtures";
import { useChatMessagesListener } from "./use-chat-messages";

export const key = (guildId = "guild-1") =>
  getChatControllerGetChatMessagesQueryKey({ guildId });

export const message = (
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

export const created = (message: ChatMessage): ServerEvent => ({
  v: 1,
  type: "chat.created",
  data: { organizationId: message.guildId, payload: message },
});

export const accessUpdate = (organizationIds: string[]): ServerEvent => ({
  v: 1,
  type: "permissions.updated",
  data: {
    accessPolicy: ownerAccessPolicy(organizationIds),
    changes: [],
    organizationIds,
    subscriptionScopes: [],
  },
});

export const notifications = () =>
  useNotificationsStore.getState().notifications;

type ChatMessagesFixture = {
  harness: ReturnType<typeof createRealtimeTest>;
  frameCallbacks: Map<number, FrameRequestCallback>;
};

export let fixture: ChatMessagesFixture;

beforeEach(() => {
  fixture = {
    harness: createRealtimeTest(),
    frameCallbacks: new Map(),
  };
  let nextFrameId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    fixture.frameCallbacks.set(id, callback);

    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    fixture.frameCallbacks.delete(id),
  );
  fixture.harness.queryClient.setQueryData(key(), []);
  fixture.harness.queryClient.setQueryData(key("guild-2"), []);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

export const mount = (
  options?: Parameters<typeof useChatMessagesListener>[0],
) => {
  const result = renderHook(() => useChatMessagesListener(options), {
    wrapper: fixture.harness.wrapper,
  });

  fixture.harness.open();

  return result;
};

export const flushFrame = () =>
  act(() => {
    const callbacks = [...fixture.frameCallbacks.values()];
    fixture.frameCallbacks.clear();
    callbacks.forEach((callback) => callback(0));
  });

export const cached = (guildId = "guild-1") =>
  fixture.harness.queryClient.getQueryData<ChatMessage[]>(key(guildId));

export const loseAccount = () =>
  act(() => {
    const game = useGameStore.getState().game;

    if (!game) throw new Error("Expected game");
    useGameStore.getState().replaceGame({
      ...game,
      hero: { ...game.hero, accountId: "other-account" },
    });
  });
