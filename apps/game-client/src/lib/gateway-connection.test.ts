import { afterEach, expect, it, vi } from "vitest";
import { decodeRealtimeFrame as parseRealtimeFrame } from "@lootlog/protocol/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { createGameRealtimeClient } from "./game-client-platform";

class GatewayWebSocket extends EventTarget {
  binaryType = "arraybuffer";
  readyState = 0;
  static instances: GatewayWebSocket[] = [];

  constructor(
    _url: string,
    readonly protocols: string[],
  ) {
    super();
    GatewayWebSocket.instances.push(this);
  }

  send(data: string | Uint8Array) {
    const json = this.protocols.includes("lootlog.realtime.json.v1");
    expect(typeof data === "string").toBe(json);
    const request =
      typeof data === "string"
        ? parseRealtimeFrame(JSON.parse(data))
        : decodeRealtimeFrame(data);
    if (!("requestId" in request) || !request.requestId) {
      throw new Error("Expected a realtime request");
    }
    const reply = {
      v: 1,
      requestId: request.requestId,
      status: "success",
      data: {},
    } as const;
    const event = {
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection-1",
        organizationIds: [],
        subscriptionScopes: [],
      },
    } as const;
    for (const frame of [reply, event]) {
      this.dispatchEvent(
        new MessageEvent("message", {
          data: json ? JSON.stringify(frame) : encodeRealtimeFrame(frame),
        }),
      );
    }
  }

  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  GatewayWebSocket.instances = [];
});

it.each([
  ["development", "messagepack", "lootlog.realtime.v1"],
  ["production-local", "messagepack", "lootlog.realtime.v1"],
  ["production", "messagepack", "lootlog.realtime.v1"],
  ["development", "json", "lootlog.realtime.json.v1"],
])("joins and stays connected in %s", async (mode, encoding, protocol) => {
  vi.stubEnv("MODE", mode);
  vi.stubEnv("VITE_GATEWAY_FRAME_ENCODING", encoding);
  vi.stubGlobal("WebSocket", GatewayWebSocket);
  vi.stubGlobal("fetch", () =>
    Promise.resolve(
      Response.json({ ticket: "test-ticket", expiresAt: Date.now() + 60000 }),
    ),
  );
  const client = createGameRealtimeClient();
  try {
    client.connect();
    await vi.waitFor(() => expect(GatewayWebSocket.instances).toHaveLength(1));
    const socket = GatewayWebSocket.instances[0];
    if (!socket) throw new Error("WebSocket was not created");
    expect(socket.protocols).toContain(protocol);
    socket.readyState = 1;
    socket.dispatchEvent(new Event("open"));
    await expect(
      client.join({
        world: "alpha",
        character: {
          world: "alpha",
          name: "Hero",
          lvl: 100,
          icon: "hero.gif",
          characterId: "10",
          accountId: "20",
          prof: "w",
        },
      }),
    ).resolves.toEqual({});
    client.disconnect();
  } finally {
    client.disconnect();
  }
});
