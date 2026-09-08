import type { PlayerPresenceUpdatePayload } from "@/lib/online-players-presence";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { GatewayEvent } from "@/config/gateway";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RealtimeClient,
  type ServerEvent,
  type ClientCommand,
  type BasicPresence,
} from "@lootlog/client/realtime";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { RealtimeWire } from "@/test/realtime-wire";

type SocketServerResponse =
  | Awaited<ReturnType<AppSocket["emitWithAck"]>>
  | { presences: BasicPresence[] };
const mocks = {
  join: vi.fn<
    (
      data: Extract<ClientCommand, { type: "session.join" }>["data"],
    ) => Promise<Awaited<ReturnType<AppSocket["join"]>>>
  >(),
  request:
    vi.fn<
      (
        type: ClientCommand["type"],
        data: ClientCommand["data"],
      ) => Promise<SocketServerResponse>
    >(),
};
let wire: RealtimeWire;
let restorePlatform = () => {};
let proofAvailable = true;
const proofRequests: Request[] = [];
const sockets: AppSocket[] = [];
const createSocket = () => {
  const socket = new AppSocket();
  sockets.push(socket);
  socket.connect();
  wire.open();
  return socket;
};
afterEach(() => {
  sockets.splice(0).forEach((socket) => socket.dispose());
  restorePlatform();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
    wire = new RealtimeWire();
    proofAvailable = true;
    proofRequests.length = 0;
    mocks.join.mockReset();
    mocks.request.mockReset();
    mocks.join.mockResolvedValue({
      connectionId: "connection-1",
      organizationIds: ["organization-1"],
    });
    mocks.request.mockResolvedValue(undefined);
    const originalSend = wire.send.bind(wire);
    vi.spyOn(wire, "send").mockImplementation((bytes) => {
      originalSend(bytes);
      const frame = wire.frames[wire.frames.length - 1];
      if (
        !frame ||
        !("type" in frame) ||
        !("requestId" in frame) ||
        !frame.requestId
      )
        throw new Error("Expected request frame");
      const requestId = frame.requestId;
      const reply =
        frame.type === "session.join"
          ? mocks.join(frame.data)
          : mocks.request(frame.type, frame.data);
      void Promise.resolve(reply).then((data) =>
        wire.receive({ v: 1, requestId, status: "success", data }),
      );
    });
    const realtime = new RealtimeClient({
      url: "https://gateway.test",
      webSocketFactory: () => wire,
    });
    restorePlatform = configureGameClientPlatform({
      fetch: globalThis.fetch,
      createRealtime: () => realtime,
    });
    vi.stubGlobal(
      "fetch",
      async (input: string | URL | Request, init?: RequestInit) => {
        const request = new Request(input, init);
        proofRequests.push(request);
        if (!proofAvailable) return new Response(null, { status: 503 });
        const token = new URLSearchParams(await request.text()).get("token");
        return Response.json({
          user_id: "20",
          token,
          ts: 1700000000,
          validatedString: `20+${token}+1700000000`,
          signatureBase64: "signature",
        });
      },
    );
    useSettingsStore.setState({
      guildIdByCharId: {},
      presenceOrganizationIdsByCharId: {},
    });
  });

  it("preserves Discord member identity across presence fetch, snapshot and deltas", async () => {
    const socket = createSocket();
    const listener = vi.fn<(payload: PlayerPresenceUpdatePayload) => void>();
    socket.on(GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE, listener);
    const presence = {
      userId: "internal-user-1",
      discordId: "discord-1",
      sessionId: "session-1",
      platform: "game" as const,
      status: "online" as const,
      confidence: "reported" as const,
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
    const events: ServerEvent[] = [
      {
        v: 1,
        type: "presence.snapshot",
        data: {
          organizationId: "organization-1",
          revision: 1,
          presences: [presence],
        },
      },
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
          changes: [{ action: "upsert", presence }],
        },
      },
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
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
    ];
    for (const event of events) wire.receive(event);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(3));
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
    const socket = createSocket();
    await socket.join(joinData);

    expect(proofRequests).toHaveLength(1);
    expect(proofRequests[0]?.method).toBe("POST");
    expect(mocks.join).toHaveBeenCalledTimes(2);
    expect(mocks.join.mock.calls[0]?.[0]).not.toHaveProperty(
      "margonemAccountProof",
    );
    expect(mocks.join.mock.calls[1]?.[0]).toMatchObject({
      margonemAccountProof: { signatureBase64: "signature" },
    });
  });

  it("keeps the reported session when an account proof is unavailable", async () => {
    proofAvailable = false;
    const socket = createSocket();

    await expect(socket.join(joinData)).resolves.toMatchObject({
      connectionId: "connection-1",
      organizationIds: ["organization-1"],
    });

    expect(mocks.join).toHaveBeenCalledTimes(1);
    expect(mocks.join.mock.calls[0]?.[0]).not.toHaveProperty(
      "margonemAccountProof",
    );
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
    const socket = createSocket();
    await socket.join(joinData);
    socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: false });
    await vi.waitFor(() => expect(mocks.request).toHaveBeenCalled());

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
      const socket = createSocket();
      mocks.join.mockResolvedValue({
        connectionId: "connection-1",
        organizationIds: ["organization-1", "organization-2"],
      });
      const { clan: _clan, ...clanlessJoinData } = joinData;
      await socket.join(clanlessJoinData);
      socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: false });
      await vi.waitFor(() => expect(mocks.request).toHaveBeenCalled());

      expect(mocks.request).toHaveBeenCalledWith(
        "presence.publish",
        expect.objectContaining({
          organizationIds: ["organization-1", "organization-2"],
        }),
      );
    },
  );

  it("passes exact map-ping and air-tag acknowledgements through unchanged", async () => {
    const mapAck = {
      status: "accepted" as const,
      pingId: "ping-1",
      extension: { sequence: 1 },
    };
    const subscriptionAck = {
      status: "accepted" as const,
      requestId: "air-request-1",
      scopes: [],
    };
    const observationAck = {
      status: "accepted" as const,
      acceptedScopes: 1,
      acceptedTargets: 2,
    };
    mocks.request
      .mockResolvedValueOnce(mapAck)
      .mockResolvedValueOnce(subscriptionAck)
      .mockResolvedValueOnce(observationAck);
    const socket = createSocket();

    await expect(
      socket.emitWithAck(GatewayEvent.MAP_PING_SEND, {
        expectedMapId: 7,
        type: "enemy",
        x: 1,
        y: 2,
      }),
    ).resolves.toEqual(mapAck);
    await expect(
      socket.emitWithAck(GatewayEvent.AIR_TAG_SUBSCRIPTION, {
        requestId: "air-request-1",
        enabled: true,
        expectedMapId: 7,
      }),
    ).resolves.toEqual(subscriptionAck);
    await expect(
      socket.emitWithAck(GatewayEvent.AIR_TAG_OBSERVATION, {
        expectedMapId: 7,
        observations: [],
      }),
    ).resolves.toEqual(observationAck);
    expect(mocks.request).toHaveBeenNthCalledWith(2, "air-tag.subscription", {
      requestId: "air-request-1",
      enabled: true,
      expectedMapId: 7,
    });
  });
  it("keeps unsupported legacy commands local and resolves without an acknowledgement payload", async () => {
    const socket = createSocket();
    await expect(
      socket.emitWithAck(GatewayEvent.CHAT_MESSAGE),
    ).resolves.toBeUndefined();
    expect(wire.frames).toHaveLength(0);
  });

  it("reports one timeout and ignores a later successful server acknowledgement", async () => {
    let complete: ((response: SocketServerResponse) => void) | undefined;
    mocks.request.mockReturnValueOnce(
      new Promise<SocketServerResponse>((resolve) => {
        complete = resolve;
      }),
    );
    const socket = createSocket();
    const acknowledgement =
      vi.fn<(error: Error | null, response?: SocketServerResponse) => void>();
    socket
      .timeout(5)
      .emit(
        GatewayEvent.MAP_PING_SEND,
        { expectedMapId: 7, type: "enemy", x: 1, y: 2 },
        acknowledgement,
      );
    await vi.waitFor(() => expect(acknowledgement).toHaveBeenCalledOnce());
    expect(acknowledgement.mock.calls[0]?.[0]?.message).toBe(
      "Realtime acknowledgement timeout",
    );
    complete?.({ status: "accepted", pingId: "late" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(acknowledgement).toHaveBeenCalledOnce();
    expect(mocks.request).toHaveBeenCalledOnce();
  });

  it("rejects malformed successful map acknowledgements before they reach consumers", async () => {
    mocks.request.mockReturnValueOnce(
      new Promise<SocketServerResponse>(() => {}),
    );
    const socket = createSocket();
    const result = socket.emitWithAck(GatewayEvent.MAP_PING_SEND, {
      expectedMapId: 7,
      type: "enemy",
      x: 1,
      y: 2,
    });
    await vi.waitFor(() => expect(wire.frames).toHaveLength(1));
    const frame = wire.frames[0];
    if (!frame || !("requestId" in frame) || !frame.requestId)
      throw new Error("Missing request");
    wire.receive({
      v: 1,
      requestId: frame.requestId,
      status: "success",
      data: { status: "accepted", pingId: 8 },
    });
    await expect(result).rejects.toThrow("Invalid map-ping.send response");
  });
});
