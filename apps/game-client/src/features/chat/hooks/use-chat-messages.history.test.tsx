import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { getSocket } from "@/lib/socket";
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
import { useChatGuildData } from "./use-chat-guild-data";

describe("useChatMessagesListener history recovery", () => {
  it("defers initial history until join, serves REST when unreachable, and recovers the first offline gap", async () => {
    fixture.harness.queryClient.removeQueries({ queryKey: key() });
    const before = message("before-offline");
    const missed = message("missed-offline");
    let history = [before];
    fixture.harness.chatHistoryRequest.mockImplementation(() =>
      Promise.resolve(Response.json(history)),
    );

    const { result } = renderHook(
      () => {
        useChatMessagesListener();

        return useChatGuildData({
          currentCharacterNick: "Current Hero",
          guilds: [{ id: "guild-1", name: "Guild" }],
          selectedGuildId: "guild-1",
        });
      },
      { wrapper: fixture.harness.wrapper },
    );

    await act(async () => {});
    expect(fixture.harness.chatHistoryRequest).not.toHaveBeenCalled();
    expect(result.current.initialLoading).toBe(true);
    act(() => fixture.harness.wire.close());
    await waitFor(() =>
      expect(result.current.messagesByGuildId["guild-1"]).toEqual([before]),
    );
    expect(fixture.harness.chatHistoryRequest).toHaveBeenCalledTimes(1);
    history = [before, missed];
    act(() => getSocket().connect());
    fixture.harness.open();
    await fixture.harness.join(
      ["guild-1"],
      createAccessPolicySnapshot(
        [
          {
            guild: { id: "guild-1", ownerId: "owner" },
            roles: [
              {
                permissions: [Capability.LOOTLOG_CHAT_READ],
                lvlRangeFrom: 0,
                lvlRangeTo: 500,
              },
            ],
          },
        ],
        "reader",
      ),
    );
    await waitFor(() =>
      expect(result.current.messagesByGuildId["guild-1"]).toEqual(history),
    );
    expect(fixture.harness.chatHistoryRequest).toHaveBeenCalledTimes(2);
  });

  it("recovers missed messages once after a policy rejoin without clearing the transcript", async () => {
    const before = message("before", "guild-1", {
      timestamp: "2026-09-24T10:00:00.000Z",
    });

    const missed = message("missed", "guild-1", {
      timestamp: "2026-09-24T10:01:00.000Z",
    });

    const live = message("live", "guild-1", {
      timestamp: "2026-09-24T10:02:00.000Z",
    });

    fixture.harness.queryClient.setQueryData(key(), [before]);
    const renders: { ids: string[]; loading: boolean }[] = [];

    const { result } = renderHook(
      () => {
        useChatMessagesListener();
        useChatMessagesListener();

        const data = useChatGuildData({
          currentCharacterNick: "Current Hero",
          guilds: [
            { id: "guild-1", name: "Guild 1" },
            { id: "guild-2", name: "Guild 2" },
          ],
          selectedGuildId: "guild-1",
        });

        renders.push({
          ids: data.messagesByGuildId["guild-1"]?.map(({ id }) => id) ?? [],
          loading: data.initialLoading,
        });

        return data;
      },
      { wrapper: fixture.harness.wrapper },
    );

    fixture.harness.open();

    const policy = createAccessPolicySnapshot(
      [
        {
          guild: { id: "guild-1", ownerId: "owner" },
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
    );

    await fixture.harness.join(["guild-1"], policy);
    const response = Promise.withResolvers<Response>();
    fixture.harness.chatHistoryRequest.mockReturnValue(response.promise);
    act(() => fixture.harness.wire.close());
    act(() => {
      fixture.harness.realtime.connect();
      fixture.harness.wire.open();
    });
    expect(fixture.harness.chatHistoryRequest).not.toHaveBeenCalled();
    await fixture.harness.join(["guild-1"], policy);
    await waitFor(() =>
      expect(fixture.harness.chatHistoryRequest).toHaveBeenCalledOnce(),
    );
    await fixture.harness.join(["guild-1"], policy);
    expect(fixture.harness.chatHistoryRequest).toHaveBeenCalledOnce();
    expect(result.current.messagesByGuildId["guild-1"]).toEqual([before]);
    await fixture.harness.receive(created(live));
    flushFrame();
    await act(async () => {
      response.resolve(Response.json([before, missed]));
    });
    await waitFor(() =>
      expect(result.current.messagesByGuildId["guild-1"]).toEqual([
        before,
        missed,
        live,
      ]),
    );
    expect(
      renders.every(({ ids, loading }) => ids.includes("before") && !loading),
    ).toBe(true);
    expect(fixture.harness.chatHistoryRequest).toHaveBeenCalledOnce();
  });

  it("keeps accepted messages across a socket reconnect", async () => {
    mount();

    const policy = createAccessPolicySnapshot(
      [
        {
          guild: { id: "guild-1", ownerId: "owner" },
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
    );

    await fixture.harness.join(["guild-1"], policy);
    await fixture.harness.receive(created(message("during-reconnect")));
    flushFrame();
    act(() => {
      fixture.harness.realtime.disconnect();
      fixture.harness.realtime.connect();
    });
    fixture.harness.open();
    await fixture.harness.join(["guild-1"], policy);
    expect(cached()).toEqual([message("during-reconnect")]);
  });
});
