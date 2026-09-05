import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { GatewayEvent } from "@/config/gateway";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  request: vi.fn(),
  requestProof: vi.fn(),
  subscribe: vi.fn(),
  subscribeState: vi.fn(),
  setReconnectHandler: vi.fn(),
  serverListeners: [] as Array<(event: unknown) => void>,
}));

vi.mock("@lootlog/client/realtime", () => ({
  REALTIME_JSON_SUBPROTOCOL: "lootlog.realtime.json.v1",
  REALTIME_SUBPROTOCOL: "lootlog.realtime.v1",
  RealtimeClient: class {
    join = mocks.join;
    request = mocks.request;
    subscribe = mocks.subscribe;
    subscribeState = mocks.subscribeState;
    setReconnectHandler = mocks.setReconnectHandler;
    connect = vi.fn();
    disconnect = vi.fn();
  },
}));

vi.mock("@/lib/margonem-account-proof", () => ({
  requestMargonemAccountProof: mocks.requestProof,
}));

import { AppSocket, type GameSessionJoinData } from "./socket";

const joinData: GameSessionJoinData = {
  world: "alpha",
  name: "Hero",
  lvl: 100,
  icon: "hero.gif",
  prof: "w",
  characterId: "10",
  accountId: "20",
  clan: { id: 30, name: "Clan", rank: 1 },
};

describe("game realtime verification and presence selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscribeState.mockImplementation((listener) =>
      listener("disconnected"),
    );
    mocks.subscribe.mockImplementation((listener) => {
      mocks.serverListeners.push(listener);
    });
    mocks.serverListeners.length = 0;
    mocks.join.mockResolvedValue({
      connectionId: "connection-1",
      organizationIds: ["organization-1"],
    });
    mocks.requestProof.mockResolvedValue({
      userId: "20",
      characterId: "10",
      token: "token",
      ts: 1_700_000_000,
      validatedString: "20+token+1700000000",
      signatureBase64: "signature",
    });
    useSettingsStore.setState({
      guildIdByCharId: {},
      presenceOrganizationIdsByCharId: {},
    });
  });

  it("preserves Discord member identity across presence fetch, snapshot and deltas", async () => {
    const socket = new AppSocket();
    const listener = vi.fn();
    socket.on(GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE, listener);
    const presence = {
      userId: "internal-user-1",
      discordId: "discord-1",
      sessionId: "session-1",
      platform: "game",
      status: "online",
      confidence: "reported",
      isAfk: false,
      lastSeen: 1,
      organizationIds: ["organization-1"],
    };
    mocks.request.mockResolvedValueOnce({ presences: [presence] });
    await expect(
      socket.emitWithAck(GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH, {
        guildId: "organization-1",
      }),
    ).resolves.toMatchObject({
      players: { "discord-1": [{ discordId: "discord-1" }] },
    });
    for (const event of [
      {
        type: "presence.snapshot",
        data: { organizationId: "organization-1", presences: [presence] },
      },
      {
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          changes: [{ action: "upsert", presence }],
        },
      },
      {
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          changes: [
            {
              action: "remove",
              userId: presence.userId,
              discordId: presence.discordId,
              sessionId: presence.sessionId,
            },
          ],
        },
      },
    ])
      mocks.serverListeners[0]?.(event);
    expect(listener).toHaveBeenCalledTimes(3);
    for (const [payload] of listener.mock.calls)
      expect(payload).toMatchObject({
        discordId: "discord-1",
        sessionId: "session-1",
      });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "offline" }),
    );
  });

  it("joins as reported before upgrading the session with a connection-bound proof", async () => {
    const socket = new AppSocket();
    await socket.join(joinData);

    expect(mocks.requestProof).toHaveBeenCalledWith({
      socketId: "connection-1",
      accountId: "20",
      characterId: "10",
      clanId: 30,
    });
    expect(mocks.join).toHaveBeenCalledTimes(2);
    expect(mocks.join.mock.calls[0]?.[0]).toMatchObject({
      margonemAccountProof: undefined,
    });
    expect(mocks.join.mock.calls[1]?.[0]).toMatchObject({
      margonemAccountProof: { signatureBase64: "signature" },
    });
  });

  it("keeps the reported session when an account proof is unavailable", async () => {
    mocks.requestProof.mockRejectedValueOnce(new Error("Proof unavailable"));
    const socket = new AppSocket();

    await expect(socket.join(joinData)).resolves.toMatchObject({
      connectionId: "connection-1",
      organizationIds: ["organization-1"],
    });

    expect(mocks.join).toHaveBeenCalledTimes(1);
    expect(mocks.join.mock.calls[0]?.[0]).toMatchObject({
      margonemAccountProof: undefined,
    });
  });

  it("publishes to the joined organization by default", async () => {
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "20",
        characterId: "10",
        clan: { id: 30, name: "Clan", rank: 1 },
        currentHp: 100,
        icon: "hero.gif",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 100, name: "Karka-han", visibility: 0 },
      world: "alpha",
    });
    useSettingsStore.setState({
      guildIdByCharId: { "10": "organization-1" },
    });
    const socket = new AppSocket();
    await socket.join(joinData);
    socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: false });
    await Promise.resolve();

    expect(mocks.request).toHaveBeenCalledWith(
      "presence.publish",
      expect.objectContaining({ organizationIds: ["organization-1"] }),
    );
  });

  it.each([
    { selectedIds: [] },
    { selectedIds: ["organization-2"] },
    { selectedIds: ["removed-organization"] },
  ])(
    "publishes to all joined organizations despite stored selection $selectedIds",
    async ({ selectedIds }) => {
      useGameStore.getState().replaceGame({
        hero: {
          accountId: "20",
          characterId: "10",
          currentHp: 100,
          icon: "hero.gif",
          level: 100,
          maxHp: 100,
          name: "Hero",
          profession: "w",
          x: 1,
          y: 2,
        },
        interface: "ni",
        map: { id: 100, name: "Karka-han", visibility: 0 },
        world: "alpha",
      });
      useSettingsStore.setState({
        presenceOrganizationIdsByCharId: { "10": selectedIds },
      });
      const socket = new AppSocket();
      mocks.join.mockResolvedValue({
        connectionId: "connection-1",
        organizationIds: ["organization-1", "organization-2"],
      });
      const { clan: _clan, ...clanlessJoinData } = joinData;
      await socket.join(clanlessJoinData);
      socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: false });
      await Promise.resolve();

      expect(mocks.request).toHaveBeenCalledWith(
        "presence.publish",
        expect.objectContaining({
          organizationIds: ["organization-1", "organization-2"],
        }),
      );
    },
  );

  it("passes exact map-ping and air-tag acknowledgements through unchanged", async () => {
    const mapAck = { status: "accepted", pingId: "ping-1" };
    const subscriptionAck = {
      status: "accepted",
      requestId: "air-request-1",
      scopes: [],
    };
    const observationAck = {
      status: "accepted",
      acceptedScopes: 1,
      acceptedTargets: 2,
    };
    mocks.request
      .mockResolvedValueOnce(mapAck)
      .mockResolvedValueOnce(subscriptionAck)
      .mockResolvedValueOnce(observationAck);
    const socket = new AppSocket();

    await expect(
      socket.emitWithAck(GatewayEvent.MAP_PING_SEND, {
        expectedMapId: 7,
        type: "enemy",
        x: 1,
        y: 2,
      }),
    ).resolves.toBe(mapAck);
    await expect(
      socket.emitWithAck(GatewayEvent.AIR_TAG_SUBSCRIPTION, {
        requestId: "air-request-1",
        enabled: true,
        expectedMapId: 7,
      }),
    ).resolves.toBe(subscriptionAck);
    await expect(
      socket.emitWithAck(GatewayEvent.AIR_TAG_OBSERVATION, {
        expectedMapId: 7,
        observations: [],
      }),
    ).resolves.toBe(observationAck);
    expect(mocks.request).toHaveBeenNthCalledWith(2, "air-tag.subscription", {
      requestId: "air-request-1",
      enabled: true,
      expectedMapId: 7,
    });
  });
});
