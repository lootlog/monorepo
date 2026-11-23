import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { createChatMember } from "@/test/chat-fixtures";
import {
  accessUpdate,
  cached,
  created,
  fixture,
  flushFrame,
  message,
  mount,
  notifications,
} from "./use-chat-messages.fixtures";

describe("useChatMessagesListener mentions", () => {
  it.each([false, true])(
    "prefetches missing member data only for a visible chat: %s",
    async (prefetchMembers) => {
      mount({ prefetchMembers });
      await fixture.harness.receive(created(message("visibility")));
      expect(
        fixture.harness.requests.filter((url) =>
          url.endsWith("/members/summary"),
        ),
      ).toHaveLength(prefetchMembers ? 1 : 0);
    },
  );

  it("does not present a mention resolved after permissions changed", async () => {
    const response = Promise.withResolvers<Response>();
    fixture.harness.memberRequest.mockReturnValue(response.promise);
    mount();
    await fixture.harness.receive(accessUpdate(["guild-1"]));
    await fixture.harness.receive(
      created(
        message("hidden-titan", "guild-1", { message: "Hej @Current Hero" }),
      ),
    );
    await waitFor(() =>
      expect(fixture.harness.memberRequest).toHaveBeenCalledOnce(),
    );
    await fixture.harness.receive(accessUpdate([]));
    await act(async () => {
      response.resolve(Response.json(createChatMember()));
      await response.promise;
    });
    expect(notifications()).toEqual([]);
  });

  it("restricts pending messages and asynchronous mentions only in the affected organization", async () => {
    const response = Promise.withResolvers<Response>();
    fixture.harness.memberRequest.mockReturnValue(response.promise);
    mount();

    const policy = createAccessPolicySnapshot(
      ["guild-1", "guild-2"].map((id) => ({
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

    await fixture.harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        changes: [],
        organizationIds: ["guild-1", "guild-2"],
        subscriptionScopes: [],
        accessPolicy: policy,
      },
    });
    await fixture.harness.receive(
      created(
        message("unaffected", "guild-2", { message: "Hej @Current Hero" }),
      ),
      created(message("revoked")),
    );
    await fixture.harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        changes: [],
        organizationIds: ["guild-1", "guild-2"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "guild-2", ownerId: "owner" },
              roles: [
                {
                  permissions: [Capability.LOOTLOG_CHAT_READ],
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
      await fixture.harness.receive(
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

  it("does not present a mention from an NPC rank hidden in chat", async () => {
    mount({ hiddenNpcTypes: new Set(["TITAN"]) });
    await fixture.harness.receive(
      created(
        message("hidden-mention", "guild-1", {
          type: "NPC",
          message: "Hej @Current Hero",
          npc: {
            id: 1,
            name: "Titan",
            icon: "npc.gif",
            location: "Map",
            type: 3,
            wt: 100,
            prof: "w",
            lvl: 300,
          },
        }),
      ),
    );
    await fixture.harness.receive(
      created(
        message("visible-mention", "guild-1", { message: "Hej @Current Hero" }),
      ),
    );
    await waitFor(() => expect(notifications()).toHaveLength(1));
    expect(notifications()[0]).toMatchObject({
      notificationId: "chat-mention:guild-1:visible-mention",
    });
  });

  it("presents a matching chat mention through the notification pipeline", async () => {
    mount();
    await fixture.harness.receive(
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
});
