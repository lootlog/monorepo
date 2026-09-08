import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
