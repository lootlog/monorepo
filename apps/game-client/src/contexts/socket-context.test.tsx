import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { Toaster } from "@lootlog/ui/components/sonner";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createRealtimeTest } from "@/test/realtime-test";
import { useChatGuildData } from "@/features/chat/hooks/use-chat-guild-data";
import { useSocket } from "./socket-context";

const expectedJoinData = {
  accountId: "20",
  characterId: "10",
  clan: { id: 30, name: "Lootlog", rank: 4 },
  icon: "hero-icon",
  lvl: 100,
  name: "Hero",
  prof: "w",
  world: "alpha",
};

const setup = () => {
  const test = createRealtimeTest();
  setTestRuntimeGame({
    hero: {
      accountId: "20",
      characterId: "10",
      clan: expectedJoinData.clan,
      icon: "hero-icon",
      level: 100,
      name: "Hero",
      profession: "w",
    },
    world: "alpha",
  });
  render(<div />, { wrapper: test.wrapper });
  test.open();

  return test;
};

describe("SocketProvider", () => {
  it("waits for game readiness and joins without publishing precise location in the session", async () => {
    const test = setup();
    expect(
      test.wire.frames.some(
        (frame) => "type" in frame && frame.type === "session.join",
      ),
    ).toBe(false);
    act(() =>
      useGlobalStore.setState({ gameState: { gameInitialized: true } }),
    );
    await waitFor(() =>
      expect(
        test.wire.frames.some(
          (frame) => "type" in frame && frame.type === "session.join",
        ),
      ).toBe(true),
    );

    const command = test.wire.frames.find(
      (frame) => "type" in frame && frame.type === "session.join",
    );

    if (
      !command ||
      !("requestId" in command) ||
      !("data" in command) ||
      !command.requestId
    )
      throw new Error("Missing session join command");
    expect(command.data).toEqual({
      world: "alpha",
      character: expectedJoinData,
    });
    expect(command.data).not.toHaveProperty("location");
    const requestId = command.requestId;
    await act(() =>
      test.wire.receive({
        v: 1,
        requestId,
        status: "success",
        data: { connectionId: "connection-1", organizationIds: ["guild-1"] },
      }),
    );
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.joined).toBe(true),
    );
  });

  it("restores one verified session and current presence after reconnect and character changes", async () => {
    const test = setup();
    const proofs: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const token = new URLSearchParams(String(init?.body)).get("token");

      if (!token) throw new Error("Missing account proof token");
      proofs.push(token);

      return Response.json({
        user_id: "20",
        token,
        ts: 1,
        validatedString: token,
        signatureBase64: "test-signature",
      });
    });
    let connection = "connection-1";
    const send = test.wire.send.bind(test.wire);
    vi.spyOn(test.wire, "send").mockImplementation((bytes) => {
      send(bytes);
      const command = test.wire.frames.at(-1);

      if (!command || !("requestId" in command) || !command.requestId) return;
      const requestId = command.requestId;
      queueMicrotask(() =>
        test.wire.receive({
          v: 1,
          requestId,
          status: "success",
          data:
            "type" in command && command.type === "session.join"
              ? { connectionId: connection, organizationIds: ["guild-1"] }
              : { sessionId: connection },
        }),
      );
    });
    act(() =>
      useGlobalStore.setState({ gameState: { gameInitialized: true } }),
    );
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.joined).toBe(true),
    );
    act(() =>
      getSocket().emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: true }),
    );
    const firstCount = test.wire.frames.length;
    act(() => test.wire.close());
    expect(useGlobalStore.getState().socketState.joined).toBe(false);
    connection = "connection-2";
    act(() => {
      getSocket().connect();
      test.open(connection);
    });
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.joined).toBe(true),
    );
    const restored = test.wire.frames.slice(firstCount);

    const joins = restored.filter(
      (frame) => "type" in frame && frame.type === "session.join",
    );

    expect(joins).toHaveLength(1);
    expect(joins[0]).toMatchObject({ data: { character: expectedJoinData } });
    expect(joins[0]).toMatchObject({
      data: { margonemAccountProof: { token: proofs[1] } },
    });
    expect(proofs).toHaveLength(2);
    expect(proofs[0]).toContain("connection-1");
    expect(proofs[1]).toContain("connection-2");
    expect(
      restored.filter(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toHaveLength(1);
    expect(useGlobalStore.getState().socketState.joinedGuilds).toEqual([
      "guild-1",
    ]);
    expect(
      restored.find(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toMatchObject({ data: { isAfk: true } });

    const beforeCharacterChange = test.wire.frames.length;
    const game = useGameStore.getState().game;

    if (!game) throw new Error("Expected current character");
    act(() =>
      useGameStore
        .getState()
        .replaceGame({ ...game, hero: { ...game.hero, characterId: "11" } }),
    );
    expect(useGlobalStore.getState().socketState.joined).toBe(false);
    connection = "connection-3";
    test.open(connection);
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.joined).toBe(true),
    );
    const replacement = test.wire.frames.slice(beforeCharacterChange);
    expect(
      replacement.filter(
        (frame) => "type" in frame && frame.type === "session.join",
      ),
    ).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          character: expect.objectContaining({ characterId: "11" }),
          margonemAccountProof: expect.objectContaining({ token: proofs[2] }),
        }),
      }),
    ]);
    expect(proofs[2]).toContain("connection-3");
    expect(
      replacement.find(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toMatchObject({
      data: { isAfk: false, character: { characterId: "11" } },
    });
  });

  it("synchronizes joined organizations after permission updates", async () => {
    const test = setup();
    await test.join();
    await test.receive({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: ["guild-1", "guild-2"], subscriptionScopes: [] },
    });
    expect(useGlobalStore.getState().socketState.joinedGuilds).toEqual([
      "guild-1",
      "guild-2",
    ]);
  });

  it("removes every organization when membership is revoked", async () => {
    const test = setup();
    await test.join();
    expect(useGlobalStore.getState().socketState.joinedGuilds).toEqual([
      "guild-1",
    ]);
    await test.receive({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    });
    expect(useGlobalStore.getState().socketState.joinedGuilds).toEqual([]);
  });

  it.each(["invalid", "refused"] as const)(
    "loads HTTP snapshots and recovers when the first join is %s",
    async (failure) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const test = createRealtimeTest();
      setTestRuntimeGame({ hero: { accountId: "20", characterId: "10" } });

      const { result, unmount } = renderHook(
        () => ({
          status: useSocket().status,
          chat: useChatGuildData({
            currentCharacterNick: "Hero",
            guilds: [{ id: "guild-1", name: "Guild" }],
            selectedGuildId: "guild-1",
          }),
        }),
        { wrapper: test.wrapper },
      );

      const joinRequests = () =>
        test.wire.frames.filter(
          (frame) => "type" in frame && frame.type === "session.join",
        );

      const answerJoin = async (
        answer: "invalid" | "refused" | "success",
        previousRequests: number,
      ) => {
        await vi.waitFor(() => {
          if (joinRequests().length <= previousRequests)
            throw new Error("Waiting for join request");
        });
        const request = joinRequests().at(-1);

        if (!request || !("requestId" in request) || !request.requestId)
          throw new Error("Expected join request");
        const requestId = request.requestId;

        await act(() =>
          test.wire.receive(
            answer === "refused"
              ? {
                  v: 1,
                  requestId,
                  status: "error",
                  error: {
                    code: "SUBSCRIPTION_LIMIT_EXCEEDED",
                    message: "Subscription limit exceeded",
                    retryable: false,
                  },
                }
              : {
                  v: 1,
                  requestId,
                  status: "success",
                  data:
                    answer === "success"
                      ? { connectionId: "connection-1", organizationIds: [] }
                      : {},
                },
          ),
        );
      };

      try {
        test.open();
        act(() =>
          useGlobalStore.setState({ gameState: { gameInitialized: true } }),
        );
        expect(result.current.status).toBe("connecting");
        expect(test.chatHistoryRequest).not.toHaveBeenCalled();

        await answerJoin(failure, 0);
        await waitFor(() => expect(result.current.status).toBe("unreachable"));
        await waitFor(() =>
          expect(test.chatHistoryRequest).toHaveBeenCalledTimes(1),
        );

        const failedRequests = joinRequests().length;

        // An invalid response leaves the socket open and is retried; a refusal
        // closes it until the player reconnects.
        if (failure === "refused")
          act(() => {
            getSocket().connect();
            test.open();
          });
        else await act(() => vi.advanceTimersByTimeAsync(2_000));
        await answerJoin("success", failedRequests);
        await waitFor(() => expect(result.current.status).toBe("online"));
        expect(joinRequests()).toHaveLength(failedRequests + 1);
      } finally {
        unmount();
        vi.useRealTimers();
      }
    },
  );

  const refuseJoin = async (
    test: ReturnType<typeof setup>,
    message: string,
  ) => {
    render(<Toaster />);
    act(() =>
      useGlobalStore.setState({ gameState: { gameInitialized: true } }),
    );
    let requestId: string | undefined;
    await waitFor(() => {
      const request = test.wire.frames.find(
        (frame) => "type" in frame && frame.type === "session.join",
      );

      if (!request || !("requestId" in request) || !request.requestId)
        throw new Error("Waiting for join request");
      requestId = request.requestId;
    });

    if (!requestId) throw new Error("Expected join request");
    const refusedRequestId = requestId;
    await act(() =>
      test.wire.receive({
        v: 1,
        requestId: refusedRequestId,
        status: "error",
        error: { code: "COMMAND_REJECTED", message, retryable: false },
      }),
    );
    // A refusal closes the socket until the player reconnects.
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.connected).toBe(false),
    );
  };

  it("tells the player why the gateway refused the session and offers a reconnect", async () => {
    const test = setup();
    await refuseJoin(test, "organization access denied");

    expect(
      await screen.findByText(
        "Serwer Lootloga odrzucił połączenie tej postaci",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nie masz już dostępu do tego Lootloga."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Połącz ponownie" }),
    ).toBeInTheDocument();
  });

  it("does not report a user without an Organization as a connection failure", async () => {
    const warning = vi.spyOn(toast, "warning");
    const test = setup();
    await refuseJoin(test, "no authorized organizations");

    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it("clears joined state after the transport disconnects", async () => {
    const test = setup();
    await test.join();
    expect(useGlobalStore.getState().socketState).toMatchObject({
      connected: true,
      joined: true,
      joinedGuilds: ["guild-1"],
    });
    act(() => test.wire.close());
    expect(useGlobalStore.getState().socketState).toEqual({
      connected: false,
      joined: false,
      joinedGuilds: [],
    });
  });
});
