import {
  RealtimeClient,
  type RealtimeWebSocket,
} from "@lootlog/client/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { configureGameClientPlatform } from "./game-client-platform";
import { useGameStore } from "@/store/game.store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { disposeSocket, getSocket } from "./socket";

describe("realtime socket facade lifecycle", () => {
  afterEach(() => disposeSocket());

  it("creates at most one active facade", () => {
    expect(getSocket()).toBe(getSocket());
  });

  it("fully disposes the singleton before creating a replacement", () => {
    const firstSocket = getSocket();
    const disconnect = vi.spyOn(firstSocket, "disconnect");
    const removeAllListeners = vi.spyOn(firstSocket, "removeAllListeners");

    disposeSocket();
    const secondSocket = getSocket();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeAllListeners).toHaveBeenCalledOnce();
    expect(secondSocket).not.toBe(firstSocket);
  });
});

it.each(["success", "legacy", "policy", "player"])(
  "publishes once after replacing a shared transport facade and handles rejection: %s",
  async (mode) => {
    const rejectPublication = mode !== "success";
    const listeners = new Map<string, (event: { data?: unknown }) => void>();
    const send = vi.fn((bytes: string | Uint8Array) => {
      if (!(bytes instanceof Uint8Array))
        throw new Error("Expected binary frame");
      const frame = decodeRealtimeFrame(bytes);
      if (!("requestId" in frame) || !frame.requestId)
        throw new Error("Expected request frame");
      const requestId = frame.requestId;
      queueMicrotask(() =>
        listeners.get("message")?.({
          data: encodeRealtimeFrame({
            v: 1,
            requestId,
            ...(rejectPublication
              ? {
                  status: "error" as const,
                  error: {
                    code: "UNAVAILABLE",
                    message: "Disconnected",
                    retryable: true,
                  },
                }
              : { status: "success" as const }),
          }),
        }),
      );
    });
    const wire: RealtimeWebSocket = {
      readyState: 1,
      binaryType: "arraybuffer",
      addEventListener: (type, listener) => {
        listeners.set(type, listener);
      },
      send,
      close: () => {
        listeners.get("close")?.({});
      },
    };
    const realtime = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => wire,
    });
    const restorePlatform = configureGameClientPlatform({
      fetch: globalThis.fetch,
      createRealtime: () => realtime,
    });
    const previousGame = useGameStore.getState().game;
    try {
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
      const oldFacade = getSocket();
      disposeSocket();
      const activeFacade = getSocket();
      // Disposing an old facade twice must not detach its replacement.
      oldFacade.dispose();
      activeFacade.connect();
      listeners.get("open")?.({});
      expect(activeFacade.connected).toBe(true);
      expect(oldFacade.connected).toBe(false);
      activeFacade.disconnect();
      activeFacade.connect();
      listeners.get("open")?.({});
      expect(activeFacade.connected).toBe(true);
      const { createAccessPolicySnapshot } =
        await import("@lootlog/protocol/realtime/access-policy");
      listeners.get("message")?.({
        data: encodeRealtimeFrame({
          v: 1,
          type: "permissions.updated",
          data: {
            organizationIds: ["organization-1"],
            subscriptionScopes: [],
            ...(mode === "policy"
              ? {
                  accessPolicy: createAccessPolicySnapshot(
                    [
                      {
                        guild: { id: "organization-1", ownerId: "owner" },
                        roles: [],
                      },
                    ],
                    "user",
                  ),
                }
              : {}),
          },
        }),
      });
      await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
      const bytes = send.mock.calls[0]?.[0];
      if (!(bytes instanceof Uint8Array))
        throw new Error("Expected presence publication");
      expect(decodeRealtimeFrame(bytes)).toMatchObject({
        type: "presence.publish",
        data: { organizationIds: ["organization-1"] },
      });
      if (mode === "player") {
        const { GatewayEvent } = await import("@/config/gateway");
        activeFacade.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: true });
        await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
      }
    } finally {
      disposeSocket();
      restorePlatform();
      useGameStore.setState({ game: previousGame });
    }
  },
);

it("dispatches private volunteer frames to the legacy volunteer listener", async () => {
  const listeners = new Map<string, (event: { data?: unknown }) => void>();
  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory: () => ({
      readyState: 1,
      binaryType: "arraybuffer",
      addEventListener: (type, listener) => listeners.set(type, listener),
      send: () => {},
      close: () => {},
    }),
  });
  const restore = configureGameClientPlatform({
    fetch: globalThis.fetch,
    createRealtime: () => realtime,
  });
  const { GatewayEvent } = await import("@/config/gateway");
  disposeSocket();
  const socket = getSocket();
  const received = vi.fn();
  try {
    socket.on(GatewayEvent.NOTIFICATIONS_VOLUNTEER, received);
    socket.connect();
    listeners.get("open")?.({});
    const data = {
      notificationId: "notification",
      volunteer: {
        discordId: "volunteer",
        world: "tempest",
        nick: "Volunteer",
        lvl: 250,
      },
    };
    listeners.get("message")?.({
      data: encodeRealtimeFrame({ v: 1, type: "notification.volunteer", data }),
    });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(data));
  } finally {
    disposeSocket();
    restore();
  }
});

describe("access policy synchronization", () => {
  it("applies the first policy before join and suppresses duplicate rebalance and reconnect refreshes", async () => {
    const { createAccessPolicySnapshot } =
      await import("@lootlog/protocol/realtime/access-policy");
    const { GatewayEvent } = await import("@/config/gateway");
    const { Permission } = await import("@lootlog/schema/permissions");
    let policy = createAccessPolicySnapshot(
      [
        {
          guild: { id: "organization-1", ownerId: "owner" },
          roles: [
            {
              permissions: [Permission.LOOTLOG_TIMERS_READ],
              lvlRangeFrom: 1,
              lvlRangeTo: 300,
            },
          ],
        },
      ],
      "user",
    );
    let includePolicy = true;
    let denyJoin = false;
    const listeners = new Map<string, (event: { data?: unknown }) => void>();
    const received: string[] = [];
    const policies = vi.fn(() => received.push("policy"));
    const send = vi.fn((bytes: string | Uint8Array) => {
      if (!(bytes instanceof Uint8Array))
        throw new Error("Expected binary frame");
      const frame = decodeRealtimeFrame(bytes);
      if (!("requestId" in frame) || !frame.requestId)
        throw new Error("Expected request");
      const requestId = frame.requestId;
      if (denyJoin) {
        queueMicrotask(() => {
          listeners.get("message")?.({
            data: encodeRealtimeFrame({
              v: 1,
              type: "permissions.updated",
              data: {
                organizationIds: [],
                subscriptionScopes: [],
                accessPolicy: policy,
              },
            }),
          });
          listeners.get("message")?.({
            data: encodeRealtimeFrame({
              v: 1,
              requestId,
              status: "error",
              error: {
                code: "FORBIDDEN",
                message: "No organizations",
                retryable: false,
              },
            }),
          });
        });
        return;
      }
      queueMicrotask(() =>
        listeners.get("message")?.({
          data: encodeRealtimeFrame({
            v: 1,
            requestId,
            status: "success",
            data: {
              connectionId: "connection",
              organizationIds: ["organization-1"],
              ...(includePolicy ? { accessPolicy: policy } : {}),
            },
          }),
        }),
      );
    });
    const realtime = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => ({
        readyState: 1,
        binaryType: "arraybuffer",
        addEventListener: (type, listener) => listeners.set(type, listener),
        send,
        close: () => listeners.get("close")?.({}),
      }),
    });
    const restore = configureGameClientPlatform({
      fetch: globalThis.fetch,
      createRealtime: () => realtime,
    });
    disposeSocket();
    const socket = getSocket();
    const joinData = {
      accountId: "20",
      characterId: "10",
      world: "alpha",
      name: "Hero",
      lvl: 100,
      icon: "hero.gif",
      prof: "w",
    };
    const proof = {
      userId: "20",
      characterId: "10",
      token: "token",
      ts: 1,
      validatedString: "proof",
      signatureBase64: "signature",
    };
    try {
      socket.on(GatewayEvent.PERMISSIONS_UPDATED, policies);
      socket.on(GatewayEvent.JOIN, () => received.push("join"));
      socket.connect();
      listeners.get("open")?.({});
      await socket.join(joinData, proof);
      expect(received).toEqual(["policy", "join"]);
      expect(socket.getAccessPolicy()).toEqual(policy);
      const requestsAfterJoin = send.mock.calls.length;
      for (let i = 0; i < 10; i += 1) {
        listeners.get("message")?.({
          data: encodeRealtimeFrame({
            v: 1,
            type: "permissions.updated",
            data: {
              organizationIds: ["organization-1"],
              subscriptionScopes: [],
              accessPolicy: policy,
            },
          }),
        });
      }
      await Promise.resolve();
      expect(policies).toHaveBeenCalledOnce();
      expect(send).toHaveBeenCalledTimes(requestsAfterJoin);
      await socket.join(joinData, proof);
      expect(policies).toHaveBeenCalledOnce();
      expect(send).toHaveBeenCalledTimes(requestsAfterJoin + 1);
      policy = createAccessPolicySnapshot([], "user");
      await socket.join(joinData, proof);
      expect(policies).toHaveBeenCalledTimes(2);
      expect(policies.mock.calls[1]).toBeDefined();
      expect(socket.getAccessPolicy()).toEqual(policy);
      await socket.join(
        { ...joinData, accountId: "other" },
        { ...proof, userId: "other" },
      );
      expect(policies).toHaveBeenCalledTimes(3);
      includePolicy = false;
      await socket.join(joinData, proof);
      expect(policies).toHaveBeenCalledTimes(4);
      expect(socket.getAccessPolicy()).toBeUndefined();
      expect(received.slice(-2)).toEqual(["policy", "join"]);
      denyJoin = true;
      const joinsBeforeDenial = received.filter(
        (event) => event === "join",
      ).length;
      await expect(socket.join(joinData, proof)).rejects.toThrow(
        "No organizations",
      );
      expect(received.filter((event) => event === "join")).toHaveLength(
        joinsBeforeDenial,
      );
      denyJoin = false;
      expect(socket.getAccessPolicy()).toEqual(policy);
      expect(policies).toHaveBeenCalledTimes(5);
    } finally {
      disposeSocket();
      restore();
    }
  });
});
