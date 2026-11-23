import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { authClient } from "@/lib/auth-client";
import {
  accessUpdate,
  cached,
  created,
  fixture,
  flushFrame,
  key,
  loseAccount,
  message,
  mount,
} from "./use-chat-messages.fixtures";
import { useChatMessagesListener } from "./use-chat-messages";

describe("useChatMessagesListener access and session lifecycle", () => {
  it("discards queued chat messages after permission changes", async () => {
    mount();
    await fixture.harness.receive(accessUpdate(["guild-1"]));
    await fixture.harness.receive(
      created(message("hidden-titan")),
      accessUpdate([]),
    );
    flushFrame();
    expect(cached()).toEqual([]);
  });

  it("removes cached chat histories after losing a guild", async () => {
    mount();
    await fixture.harness.join(["guild-1", "guild-2"]);
    fixture.harness.queryClient.setQueryData(["unrelated"], "kept");
    await fixture.harness.join(["guild-1"]);
    expect(cached("guild-2")).toBeUndefined();
    expect(cached()).toEqual([]);
    expect(fixture.harness.queryClient.getQueryData(["unrelated"])).toBe(
      "kept",
    );
  });

  it("removes every cached chat history after changing the game account", () => {
    mount();
    fixture.harness.queryClient.setQueryData(["unrelated"], "kept");
    loseAccount();
    expect(cached()).toBeUndefined();
    expect(cached("guild-2")).toBeUndefined();
    expect(fixture.harness.queryClient.getQueryData(["unrelated"])).toBe(
      "kept",
    );
  });

  it.each([false, true])(
    "clears cached history and queued messages on session logout (queued: %s)",
    async (queued) => {
      const { result } = renderHook(
        () => {
          useChatMessagesListener();

          return authClient.useSession().data;
        },
        { wrapper: fixture.harness.wrapper },
      );

      fixture.harness.open();
      act(() => fixture.harness.setSessionDiscordId("current-discord"));
      await waitFor(() =>
        expect(result.current?.user.discordId).toBe("current-discord"),
      );
      fixture.harness.queryClient.setQueryData(key(), [message("old-session")]);
      fixture.harness.queryClient.setQueryData(["unrelated"], "kept");

      if (queued)
        await fixture.harness.receive(created(message("queued-session")));
      act(() => fixture.harness.setSessionDiscordId(null));
      await waitFor(() => expect(result.current).toBeNull());
      flushFrame();
      expect(cached()).toBeUndefined();
      expect(fixture.harness.queryClient.getQueryData(["unrelated"])).toBe(
        "kept",
      );
    },
  );

  it("discards pending operations before removing caches on account change", async () => {
    mount();
    await fixture.harness.receive(created(message("old-account")));
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
              permissions: [Capability.LOOTLOG_CHAT_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: 500,
            },
          ],
        })),
        "user",
      );

    await fixture.harness.join(
      ["guild-1", "guild-2"],
      policy(["guild-1", "guild-2"]),
    );
    await fixture.harness.receive(
      created(message("kept")),
      created(message("dropped", "guild-2")),
    );
    await fixture.harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        changes: [],
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy(["guild-1"]),
      },
    });
    flushFrame();
    expect(cached()).toEqual([message("kept")]);
    expect(cached("guild-2")).toBeUndefined();
  });
});
