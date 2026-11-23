import { act, render as renderUi, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/api/chat.api";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import {
  cached,
  created,
  fixture,
  flushFrame,
  key,
  message,
  mount,
} from "./use-chat-messages.fixtures";
import { useChatMessagesListener } from "./use-chat-messages";

const ChatListener = () => {
  useChatMessagesListener();

  return null;
};

describe("useChatMessagesListener frame batching", () => {
  it("ingests chat events that another feature already listens to", async () => {
    const gatheringListener = vi.fn();
    getSocket().on("chat.created", gatheringListener);
    getSocket().on("chat.deleted", gatheringListener);
    fixture.harness.queryClient.setQueryData(key(), [message("deleted")]);
    mount();
    await fixture.harness.receive(created(message("live")), {
      v: 1,
      type: "chat.deleted",
      data: {
        organizationId: "guild-1",
        payload: {
          guildId: "guild-1",
          messageId: "deleted",
          routing: { tier: "base" },
        },
      },
    });
    flushFrame();
    expect(cached()).toEqual([message("live")]);
    expect(gatheringListener).toHaveBeenCalledTimes(2);
    getSocket().off("chat.created", gatheringListener);
    getSocket().off("chat.deleted", gatheringListener);
  });

  it("does not rerender when only hero coordinates change", () => {
    let renders = 0;
    renderHook(
      () => {
        renders += 1;
        useChatMessagesListener();
      },
      { wrapper: fixture.harness.wrapper },
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

    const unsubscribe = fixture.harness.queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (
          event.type === "updated" &&
          event.query.queryKey[0] === key()[0] &&
          event.action.type === "success"
        )
          updates++;
      });

    await fixture.harness.receive(
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
    fixture.harness.queryClient.setQueryData(key(), [message("existing")]);
    await fixture.harness.receive(
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
            routing: { tier: "base" },
          },
        },
      },
      {
        v: 1,
        type: "chat.deleted",
        data: {
          organizationId: "guild-1",
          payload: {
            guildId: "guild-1",
            messageId: "created",
            routing: { tier: "base" },
          },
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

    const unsubscribe = fixture.harness.queryClient
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

    await fixture.harness.receive(
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
      fixture.frameCallbacks.set(1, callback);

      return 1;
    });
    mount();
    await fixture.harness.receive(created(message("background")));
    act(() => vi.advanceTimersByTime(49));
    expect(cached()).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(cached()).toEqual([message("background")]);
  });

  it("flushes accepted operations during ordinary cleanup", async () => {
    const { rerender } = renderUi(<ChatListener />, {
      wrapper: fixture.harness.wrapper,
    });

    fixture.harness.open();
    await fixture.harness.receive(created(message("before-unmount")));
    expect(cached()).toEqual([]);
    rerender(<></>);
    expect(cached()).toEqual([message("before-unmount")]);
  });
});
