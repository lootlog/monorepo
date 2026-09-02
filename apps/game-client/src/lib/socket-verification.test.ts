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
}));

vi.mock("@lootlog/client/realtime", () => ({
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
    useSettingsStore.setState({ presenceOrganizationIdsByCharId: {} });
  });

  it("joins reported to obtain connectionId and immediately rejoins with proof", async () => {
    const socket = new AppSocket();
    await socket.join(joinData);

    expect(mocks.requestProof).toHaveBeenCalledWith({
      socketId: "connection-1",
      accountId: "20",
      characterId: "10",
      clanId: 30,
    });
    expect(mocks.join).toHaveBeenCalledTimes(2);
    expect(mocks.join.mock.calls[1]?.[0]).toMatchObject({
      margonemAccountProof: { signatureBase64: "signature" },
    });
  });

  it("does not publish when there is no explicit or clan-matched organization", async () => {
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
    const socket = new AppSocket();
    await socket.join(joinData);
    socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: false });
    await Promise.resolve();

    expect(mocks.request).not.toHaveBeenCalledWith(
      "presence.publish",
      expect.anything(),
    );
  });

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
