import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createRealtimeTest } from "@/test/realtime-test";

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

  it("restores the real provider session, fresh proof and presence after reconnect", async () => {
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
    const firstCount = test.wire.frames.length;
    act(() => test.wire.close());
    expect(useGlobalStore.getState().socketState.joined).toBe(false);
    connection = "connection-2";
    act(() => {
      getSocket().connect();
      test.wire.open();
    });
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.joined).toBe(true),
    );
    const restored = test.wire.frames.slice(firstCount);

    const joins = restored.filter(
      (frame) => "type" in frame && frame.type === "session.join",
    );

    expect(joins).toHaveLength(2);
    expect(joins[0]).toMatchObject({ data: { character: expectedJoinData } });
    expect(joins[1]).toMatchObject({
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
