import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRealtimeTest } from "@/test/realtime-test";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";
import { useOnlineCharacterOwners } from "./use-online-character-owners";

async function setup() {
  const test = createRealtimeTest();
  useCharacterTooltipCatchingGuildsStore.getState().clear();
  useOnlineCharacterOwnersStore.getState().clearOwners();
  useSettingsStore.setState({
    guildIdByCharId: { "1": "guild-1" },
    worldByGuildId: { "guild-1": "pandora" },
  });

  const view = renderHook(() => useOnlineCharacterOwners(), {
    wrapper: test.wrapper,
  });

  test.open();
  await test.join();

  const requests = () =>
    test.wire.frames.flatMap((frame) =>
      "type" in frame && frame.type === "presence.fetch" ? [frame] : [],
    );

  const activate = (active: boolean) =>
    act(() =>
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(active),
    );

  const respond = (
    index: number,
    error?: { code: string; message: string; retryable: boolean },
  ) => {
    const request = requests()[index];

    if (!request?.requestId) throw new Error("Presence request not sent");
    const requestId = request.requestId;
    act(() =>
      test.wire.receive(
        error
          ? { v: 1, requestId, status: "error", error }
          : {
              v: 1,
              requestId,
              status: "success",
              data: { presences: [] },
            },
      ),
    );
  };

  return {
    ...test,
    httpRequests: test.requests,
    view,
    requests,
    activate,
    respond,
  };
}

describe("useOnlineCharacterOwners", () => {
  it("does no owner HTTP or presence request until Shift is pressed", async () => {
    const test = await setup();
    expect(test.requests()).toHaveLength(0);
    expect(
      test.httpRequests.some((path) => path.endsWith("/members/summary")),
    ).toBe(false);
    test.activate(true);
    await waitFor(() => expect(test.requests()).toHaveLength(1));
    expect(test.requests()[0]?.data).toEqual({
      organizationId: "guild-1",
      world: "pandora",
    });
    await waitFor(() =>
      expect(
        test.httpRequests.some((path) => path.endsWith("/members/summary")),
      ).toBe(true),
    );
    test.respond(0);
    await waitFor(() =>
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("success"),
    );
  });

  it("retries transient acknowledgement failures and permits a fresh Shift activation", async () => {
    const test = await setup();
    test.activate(true);
    await waitFor(() => expect(test.requests()).toHaveLength(1));
    test.respond(0, {
      code: "UNAVAILABLE",
      message: "Temporary service failure",
      retryable: true,
    });
    await waitFor(() => expect(test.requests()).toHaveLength(2));
    test.respond(1, {
      code: "UNAVAILABLE",
      message: "Temporary service failure",
      retryable: true,
    });
    await waitFor(() =>
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("error"),
    );
    test.activate(false);
    expect(
      useOnlineCharacterOwnersStore.getState().ownersByCharacterKey,
    ).toEqual({});
    test.activate(true);
    await waitFor(() => expect(test.requests()).toHaveLength(3));
    test.respond(2);
    await waitFor(() =>
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("success"),
    );
  });

  it("retries a malformed success acknowledgement instead of reporting access denial", async () => {
    const test = await setup();
    test.activate(true);
    await waitFor(() => expect(test.requests()).toHaveLength(1));
    const requestId = test.requests()[0]?.requestId;

    if (!requestId) throw new Error("Presence request not sent");
    act(() =>
      test.wire.receive({
        v: 1,
        requestId,
        status: "success",
        data: { presences: "invalid" },
      }),
    );
    await waitFor(() => expect(test.requests()).toHaveLength(2));
    test.respond(1);
    await waitFor(() =>
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("success"),
    );
  });

  it("preserves explicit gateway access denial without retrying it", async () => {
    const test = await setup();
    test.activate(true);
    await waitFor(() => expect(test.requests()).toHaveLength(1));
    test.respond(0, {
      code: "COMMAND_REJECTED",
      message: "organization access denied",
      retryable: false,
    });
    await waitFor(() =>
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("forbidden"),
    );
    expect(test.requests()).toHaveLength(1);
  });
});
