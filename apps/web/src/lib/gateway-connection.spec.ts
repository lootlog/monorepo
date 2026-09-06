import { afterEach, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { decodeRealtimeFrame as parseRealtimeFrame } from "@lootlog/protocol/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { GatewayEvent } from "@/config/gateway";
import { GatewayClient } from "./gateway-client";

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
  ["development", "lootlog.realtime.json.v1"],
  ["production-local", "lootlog.realtime.json.v1"],
  ["production", "lootlog.realtime.v1"],
])("joins and stays connected in %s", async (mode, protocol) => {
  vi.stubEnv("MODE", mode);
  vi.stubGlobal("WebSocket", GatewayWebSocket);
  const restore = configureApiClients({
    auth: {
      baseUrl: "http://auth.test",
      fetch: async () => Response.json({ ticket: "test-ticket", expiresAt: 1 }),
    },
  });
  const client = new GatewayClient();
  const joined = vi.fn();
  client.on(GatewayEvent.JOIN, joined);
  try {
    client.connect();
    await vi.waitFor(() => expect(GatewayWebSocket.instances).toHaveLength(1));
    const socket = GatewayWebSocket.instances[0];
    if (!socket) throw new Error("WebSocket was not created");
    expect(socket.protocols).toContain(protocol);
    socket.readyState = 1;
    socket.dispatchEvent(new Event("open"));
    client.emit(GatewayEvent.JOIN, {});
    await vi.waitFor(() =>
      expect(joined).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success" }),
      ),
    );
    expect(client.connected).toBe(true);
    client.disconnect();
    expect(client.connected).toBe(false);
  } finally {
    client.disconnect();
    restore();
  }
});
