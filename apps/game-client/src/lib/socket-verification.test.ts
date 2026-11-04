import type { PlayerPresence } from "@/lib/online-players-presence";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { GLOBAL_CHAT_SHARED_CHANNEL } from "@/store/global-chat.store";
import type { CommandSuccess } from "@lootlog/protocol/realtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RealtimeClient,
  type ServerEvent,
  type ClientCommand,
} from "@lootlog/client/realtime";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { ownerAccessPolicy, RealtimeWire } from "@/test/realtime-wire";

type SocketServerResponse = CommandSuccess<ClientCommand["type"]> | undefined;

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

const hello = (connectionId: string) =>
  wire.receive({ v: 1, type: "session.hello", data: { connectionId } });

const createSocket = () => {
  const socket = new AppSocket();
  sockets.push(socket);
  socket.connect();
  wire.open();
  hello("connection-1");

  return socket;
};

afterEach(() => {
  sockets.splice(0).forEach((socket) => socket.dispose());
  restorePlatform();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
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
      subscriptionScopes: [],
      accessPolicy: ownerAccessPolicy([]),
    });
    // What the gateway answers when a test does not care about the result.
    mocks.request.mockImplementation(async (type, data) => {
      if (
        type === "subscription.subscribe" ||
        type === "subscription.unsubscribe"
      )
        return { scope: data };

      return undefined;
    });
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
    useSettingsStore.setState({ guildIdByCharId: {} });
  });

  it("hydrates via the response and reports each delta change", async () => {
    const socket = createSocket();
    const listener = vi.fn<(payload: PlayerPresence) => void>();
    socket.on("presence.changed", listener);

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
      character: {
        world: "alpha",
        name: "Hero",
        lvl: 100,
        icon: "hero.gif",
        characterId: "10",
        accountId: "20",
        prof: "w",
      },
    };

    mocks.request.mockResolvedValueOnce({
      organizationId: "organization-1",
      revision: 1,
      presences: [presence],
    });
    await expect(
      socket.fetchPresence("organization-1", "alpha", 5_000),
    ).resolves.toMatchObject({
      status: "success",
      players: {
        "discord-1": [{ sessionId: "session-1", guildId: "organization-1" }],
      },
    });
    expect(mocks.request).toHaveBeenCalledWith("presence.fetch", {
      organizationId: "organization-1",
      world: "alpha",
      delivery: "response",
    });

    const events: ServerEvent[] = [
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
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));

    for (const [payload] of listener.mock.calls)
      expect(payload).toMatchObject({
        discordId: "discord-1",
        sessionId: "session-1",
      });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "offline" }),
    );
  });

  it("joins once with a connection-bound proof", async () => {
    const socket = createSocket();
    await socket.join(joinData);

    expect(proofRequests).toHaveLength(1);
    expect(proofRequests[0]?.method).toBe("POST");
    expect(mocks.join).toHaveBeenCalledTimes(1);
    expect(mocks.join.mock.calls[0]?.[0]).toMatchObject({
      margonemAccountProof: { signatureBase64: "signature" },
    });
  });

  it("coalesces concurrent and repeated joins for the same character on one connection", async () => {
    const socket = createSocket();
    await Promise.all([socket.join(joinData), socket.join(joinData)]);
    await socket.join(joinData);
    expect(proofRequests).toHaveLength(1);
    expect(mocks.join).toHaveBeenCalledOnce();
  });

  it.each(["dispose", "reconnect", "character"] as const)(
    "does not join with an obsolete proof after %s while it is pending",
    async (change) => {
      vi.useFakeTimers();
      const fetchProof = globalThis.fetch;
      const response = Promise.withResolvers<void>();

      const proofFetch = vi
        .fn<typeof fetch>()
        .mockImplementationOnce(async (...args) => {
          await response.promise;

          return fetchProof(...args);
        })
        .mockImplementation(fetchProof);

      vi.stubGlobal("fetch", proofFetch);
      const socket = createSocket();
      const oldJoin = socket.join(joinData);
      const oldOutcome = oldJoin.catch((error: Error) => error);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(mocks.join).not.toHaveBeenCalled();
      expect(proofFetch).toHaveBeenCalledOnce();

      if (change === "dispose") {
        socket.dispose();
      } else {
        if (change === "reconnect") {
          socket.disconnect();
          socket.connect();
          wire.open();
          hello("connection-2");
          mocks.join.mockResolvedValue({
            connectionId: "connection-2",
            organizationIds: ["organization-1"],
            subscriptionScopes: [],
            accessPolicy: ownerAccessPolicy([]),
          });
        }

        const currentJoin = socket.join({
          ...joinData,
          characterId: change === "character" ? "11" : "10",
        });

        await vi.advanceTimersByTimeAsync(1_000);
        await currentJoin;
      }

      response.resolve();
      expect(await oldOutcome).toMatchObject({
        message: expect.stringContaining("Realtime session changed"),
      });

      const verifiedJoins = mocks.join.mock.calls
        .map(([data]) => data)
        .filter((data) => data.margonemAccountProof);

      const currentProof = expect.objectContaining({
        characterId: change === "character" ? "11" : "10",
        token: expect.stringContaining(
          `lootlog:${change === "reconnect" ? "connection-2" : "connection-1"}:20:`,
        ),
      });

      expect(verifiedJoins.map((data) => data.margonemAccountProof)).toEqual(
        change === "dispose" ? [] : [currentProof],
      );
    },
  );

  it("abandons a pending account proof when the session is disposed", async () => {
    const response = Promise.withResolvers<Response>();
    vi.stubGlobal("fetch", () => response.promise);
    const socket = createSocket();
    const joined = socket.join(joinData);
    const outcome = joined.catch((error: Error) => error);
    await Promise.resolve();
    socket.dispose();
    response.resolve(new Response(null, { status: 503 }));
    expect(await outcome).toMatchObject({
      message: expect.stringContaining("Realtime session changed"),
    });
    expect(mocks.join).not.toHaveBeenCalled();
  });

  it("discards an old character proof before sending the replacement character join", async () => {
    const response = Promise.withResolvers<Response>();

    const proofFetch = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response(null, { status: 503 }));

    vi.stubGlobal("fetch", proofFetch);
    const socket = createSocket();
    const oldJoin = socket.join(joinData);
    const outcome = oldJoin.catch((error: Error) => error);
    await vi.waitFor(() => expect(proofFetch).toHaveBeenCalledOnce());
    const newJoin = socket.join({ ...joinData, characterId: "11" });
    response.resolve(new Response(null, { status: 503 }));
    expect(await outcome).toMatchObject({
      message: expect.stringContaining("Realtime session changed"),
    });
    await newJoin;
    expect(mocks.join).toHaveBeenCalledOnce();
    expect(mocks.join.mock.calls[0]?.[0]).toMatchObject({
      character: { characterId: "11" },
    });
  });

  it("keeps one reported join when the proof times out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      (_input: Parameters<typeof fetch>[0], init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const socket = createSocket();
    const joined = socket.join(joinData);
    await vi.advanceTimersByTimeAsync(5_000);
    await joined;
    expect(mocks.join).toHaveBeenCalledOnce();
    expect(mocks.join.mock.calls[0]?.[0]).not.toHaveProperty(
      "margonemAccountProof",
    );
  });

  it("follows a global chat channel once joined, renewing it on every join", async () => {
    const globalChatRequests = () =>
      mocks.request.mock.calls.filter(([type]) =>
        type.startsWith("subscription."),
      );

    const subscribed = vi.fn();
    const socket = createSocket();
    socket.on("global-chat.subscribed", subscribed);
    socket.followGlobalChat("gordion");
    // The join renews the subscription, so none is sent before it.
    expect(globalChatRequests()).toEqual([]);
    await socket.join(joinData);
    await vi.waitFor(() => expect(subscribed).toHaveBeenCalledWith("gordion"));

    socket.disconnect();
    socket.connect();
    wire.open();
    wire.receive({
      v: 1,
      type: "session.hello",
      data: { connectionId: "connection-1" },
    });
    await socket.join(joinData);
    await vi.waitFor(() => expect(subscribed).toHaveBeenCalledTimes(2));

    socket.followGlobalChat(GLOBAL_CHAT_SHARED_CHANNEL);
    await vi.waitFor(() =>
      expect(subscribed).toHaveBeenLastCalledWith(GLOBAL_CHAT_SHARED_CHANNEL),
    );
    socket.followGlobalChat(undefined);

    await vi.waitFor(() =>
      expect(globalChatRequests()).toEqual([
        [
          "subscription.subscribe",
          { topic: "global.chat.world", world: "gordion" },
        ],
        [
          "subscription.subscribe",
          { topic: "global.chat.world", world: "gordion" },
        ],
        [
          "subscription.unsubscribe",
          { topic: "global.chat.world", world: "gordion" },
        ],
        ["subscription.subscribe", { topic: "global.chat" }],
        ["subscription.unsubscribe", { topic: "global.chat" }],
      ]),
    );
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

  it.each<{
    scopes: (string[] | undefined)[];
    publishedAtJoin: unknown[];
    publications: number;
  }>([
    { scopes: [], publishedAtJoin: [], publications: 0 },
    // Another account's scope is dropped while the next one loads.
    {
      scopes: [["organization-2"], undefined],
      publishedAtJoin: [],
      publications: 0,
    },
    {
      scopes: [["organization-2"]],
      publishedAtJoin: [
        expect.objectContaining({ organizationIds: ["organization-2"] }),
      ],
      publications: 2,
    },
  ])(
    "publishes only the character's known catching scope, before announcing the join ($scopes)",
    async ({ scopes, publishedAtJoin, publications }) => {
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
          stasis: false,
          x: 1,
          y: 2,
        },
        gameVersion: "pl",
        interface: "ni",
        map: { id: 100, name: "Karka-han", visibility: 0 },
        world: "alpha",
      });
      const socket = createSocket();

      for (const scope of scopes) socket.setPresenceOrganizations(scope);
      mocks.join.mockResolvedValue({
        connectionId: "connection-1",
        organizationIds: ["organization-1", "organization-2"],
        subscriptionScopes: [],
        accessPolicy: ownerAccessPolicy([]),
      });

      const scopesAtJoin: unknown[] = [];

      socket.on("join", () => {
        for (const [type, data] of mocks.request.mock.calls) {
          if (type === "presence.publish") scopesAtJoin.push(data);
        }
      });

      const { clan: _clan, ...clanlessJoinData } = joinData;
      await socket.join(clanlessJoinData);
      void socket.publishPresence();

      expect(scopesAtJoin).toEqual(publishedAtJoin);
      expect(
        mocks.request.mock.calls.filter(
          ([type]) => type === "presence.publish",
        ),
      ).toHaveLength(publications);
    },
  );

  it("reports one timeout and ignores a later successful server acknowledgement", async () => {
    let complete: ((response: SocketServerResponse) => void) | undefined;
    mocks.request.mockReturnValueOnce(
      new Promise<SocketServerResponse>((resolve) => {
        complete = resolve;
      }),
    );
    const socket = createSocket();

    const acknowledgement = socket.request(
      "map-ping.send",
      { expectedMapId: 7, type: "enemy", x: 1, y: 2 },
      5,
    );

    await expect(acknowledgement).rejects.toThrow(
      "Realtime acknowledgement timeout",
    );
    complete?.({ status: "accepted", pingId: "late" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(mocks.request).toHaveBeenCalledOnce();
  });

  it("rejects malformed successful map acknowledgements before they reach consumers", async () => {
    mocks.request.mockReturnValueOnce(
      new Promise<SocketServerResponse>(() => {}),
    );
    const socket = createSocket();

    const result = socket.request("map-ping.send", {
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
