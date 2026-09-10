import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { ChatMessage } from "@/api/chat.api";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/client/main";
import {
  applyChatAccessPolicy,
  applyLegacyChatAccessChange,
  retainChatAccessPolicy,
} from "./chat-access-policy";

const key = (guildId: string) =>
  getChatControllerGetChatMessagesQueryKey({ guildId });

const message = (
  guildId: string,
  id: string,
  lvl = 100,
  wt = 100,
): ChatMessage => ({
  id,
  guildId,
  senderId: "sender",
  message: id,
  timestamp: "2026-09-07T00:00:00.000Z",
  type: "NPC",
  characterData: {
    nick: "Player",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "icon",
  },
  npc: {
    id: 1,
    name: id,
    location: "map",
    lvl,
    wt,
    type: 3,
    prof: "w",
    icon: "icon",
  },

  canDelete: false,
});

const policy = (titanAccess = true, maxLevel = 500) =>
  createAccessPolicySnapshot(
    ["one", "two"].map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [
        {
          permissions: [
            Permission.LOOTLOG_CHAT_READ,
            ...(id === "two" || titanAccess
              ? [Permission.LOOTLOG_CHAT_TITANS_READ]
              : []),
          ],
          lvlRangeFrom: 0,
          lvlRangeTo: id === "two" ? 500 : maxLevel,
        },
      ],
    })),
    "user",
  );

afterEach(() => vi.useRealTimers());

describe("chat policy reconciliation", () => {
  it("keeps unchanged rebalance and reconnect silent and preserves cache references", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const release = retainChatAccessPolicy(client);
    applyChatAccessPolicy(client, policy());
    const rows = [message("one", "titan")];
    client.setQueryData(key("one"), rows);
    const fetch = vi.fn<() => Promise<ChatMessage[]>>().mockResolvedValue(rows);

    const observer = new QueryObserver(client, {
      queryKey: key("one"),
      queryFn: fetch,
      staleTime: Infinity,
    });

    const unsubscribe = observer.subscribe(() => {});

    for (let i = 0; i < 20; i++) applyChatAccessPolicy(client, policy());
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).not.toHaveBeenCalled();
    expect(client.getQueryData(key("one"))).toBe(rows);
    unsubscribe();
    release();
    client.clear();
  });

  it("removes revoked titans from inactive cache and cancels an older response without affecting other organizations", async () => {
    const client = new QueryClient();
    applyChatAccessPolicy(client, policy());
    const visible = message("one", "elite", 100, 20);
    const forbidden = message("one", "titan");
    const other = [message("two", "other-titan")];
    client.setQueryData(key("one"), [visible, forbidden]);
    client.setQueryData(key("two"), other);
    let resolve: ((rows: ChatMessage[]) => void) | undefined;

    const request = client
      .fetchQuery({
        queryKey: key("one"),
        queryFn: () =>
          new Promise<ChatMessage[]>((done) => {
            resolve = done;
          }),
      })
      .catch(() => undefined);

    applyChatAccessPolicy(client, policy(false));
    expect(client.getQueryData(key("one"))).toEqual([visible]);
    expect(client.getQueryData(key("two"))).toBe(other);
    resolve?.([visible, forbidden]);
    await request;
    expect(client.getQueryData(key("one"))).toEqual([visible]);
    client.clear();
  });

  it("immediately retries permitted history interrupted by the first snapshot", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const release = retainChatAccessPolicy(client);
    client.setQueryData(key("one"), [message("one", "revoked")]);
    let resolve: ((rows: ChatMessage[]) => void) | undefined;
    const rows = [message("two", "allowed")];

    const fetch = vi
      .fn<() => Promise<ChatMessage[]>>()
      .mockImplementationOnce(
        () =>
          new Promise<ChatMessage[]>((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValue(rows);

    const observer = new QueryObserver(client, {
      queryKey: key("two"),
      queryFn: fetch,
    });

    const off = observer.subscribe(() => {});
    applyChatAccessPolicy(client, policy(false));
    expect(client.getQueryData(key("one"))).toEqual([]);
    expect(client.getQueryData(key("two"))).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve?.([message("two", "stale")]);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getQueryData(key("two"))).toEqual(rows);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(key("two"))).toEqual(rows);
    off();
    release();
    client.clear();
  });

  it("does not restart history denied by the first snapshot", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const release = retainChatAccessPolicy(client);
    let resolve: ((rows: ChatMessage[]) => void) | undefined;

    const fetch = vi.fn(
      () =>
        new Promise<ChatMessage[]>((done) => {
          resolve = done;
        }),
    );

    const observer = new QueryObserver(client, {
      queryKey: key("removed"),
      queryFn: fetch,
    });

    const off = observer.subscribe(() => {});
    applyChatAccessPolicy(client, policy());
    resolve?.([message("removed", "stale")]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(key("removed"))).toEqual([]);
    off();
    release();
    client.clear();
  });

  it("purges cache on a legacy gateway burst and performs one delayed active refresh", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const release = retainChatAccessPolicy(client);
    applyChatAccessPolicy(client, policy());
    client.setQueryData(key("one"), [message("one", "revoked")]);
    client.setQueryData(key("two"), [message("two", "inactive")]);
    const fetch = vi.fn<() => Promise<ChatMessage[]>>().mockResolvedValue([]);

    const observer = new QueryObserver(client, {
      queryKey: key("one"),
      queryFn: fetch,
      staleTime: Infinity,
    });

    const off = observer.subscribe(() => {});

    for (let i = 0; i < 10; i++) applyLegacyChatAccessChange(client);
    expect(client.getQueryData(key("one"))).toEqual([]);
    expect(client.getQueryData(key("two"))).toEqual([]);
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(key("two"))?.isInvalidated).toBe(true);
    off();
    release();
    client.clear();
  });

  it("leaves a pending expansion stale on last listener cleanup without fetching after unmount", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const release = retainChatAccessPolicy(client);
    applyChatAccessPolicy(client, policy(false));
    const rows = [message("one", "elite", 100, 20)];
    client.setQueryData(key("one"), rows);
    const fetch = vi.fn<() => Promise<ChatMessage[]>>().mockResolvedValue(rows);

    const observer = new QueryObserver(client, {
      queryKey: key("one"),
      queryFn: fetch,
      staleTime: Infinity,
    });

    const unsubscribe = observer.subscribe(() => {});
    applyChatAccessPolicy(client, policy());
    unsubscribe();
    release();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).not.toHaveBeenCalled();
    expect(client.getQueryState(key("one"))?.isInvalidated).toBe(true);
    expect(client.getQueryData(key("one"))).toBe(rows);
    client.clear();
  });

  it("prunes a narrowed level range and batches expansions once across mounted listeners without clearing rows", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const release = retainChatAccessPolicy(client);
    const releaseSecond = retainChatAccessPolicy(client);
    applyChatAccessPolicy(client, policy());
    const low = message("one", "low", 50);
    client.setQueryData(key("one"), [low, message("one", "high", 300)]);
    let resolve: ((rows: ChatMessage[]) => void) | undefined;

    const fetch = vi.fn<() => Promise<ChatMessage[]>>(
      () =>
        new Promise<ChatMessage[]>((done) => {
          resolve = done;
        }),
    );

    const observer = new QueryObserver(client, {
      queryKey: key("one"),
      queryFn: fetch,
      staleTime: Infinity,
    });

    const unsubscribe = observer.subscribe(() => {});
    applyChatAccessPolicy(client, policy(true, 100));
    expect(client.getQueryData(key("one"))).toEqual([low]);
    applyChatAccessPolicy(client, policy(true, 200));
    applyChatAccessPolicy(client, policy(true, 200));
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetch).not.toHaveBeenCalled();
    expect(client.getQueryData(key("one"))).toEqual([low]);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data).toEqual([low]);
    expect(observer.getCurrentResult().isFetching).toBe(true);
    resolve?.([low, message("one", "restored", 200)]);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getQueryData(key("one"))).toHaveLength(2);
    unsubscribe();
    release();
    releaseSecond();
    client.clear();
  });
});
