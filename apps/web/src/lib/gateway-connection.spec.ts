import { afterEach, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { GatewayClient } from "./gateway-client";

class GatewayWebSocket extends EventTarget {
  readyState = 0;
  static instances: GatewayWebSocket[] = [];

  constructor(
    _url: string,
    readonly protocols: string[],
  ) {
    super();
    GatewayWebSocket.instances.push(this);
  }

  send(data: string) {
    const request = decodeRealtimeFrame(data);

    if (!("requestId" in request) || !request.requestId) {
      throw new Error("Expected a realtime request");
    }

    const joined = {
      connectionId: "connection-1",
      organizationIds: [],
      subscriptionScopes: [],
      accessPolicy: { version: "policy-1", organizations: [] },
    };

    const reply = {
      v: 1,
      requestId: request.requestId,
      status: "success",
      data: "type" in request && request.type === "session.join" ? joined : {},
    } as const;

    const event = { v: 1, type: "session.joined", data: joined } as const;

    for (const frame of [reply, event]) {
      this.dispatchEvent(
        new MessageEvent("message", {
          data: encodeRealtimeFrame(frame),
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

it.each(["development", "production-local", "production"])(
  "joins and stays connected in %s",
  async (mode) => {
    vi.stubEnv("MODE", mode);
    vi.stubGlobal("WebSocket", GatewayWebSocket);

    const restore = configureApiClients({
      auth: {
        baseUrl: "http://auth.test",
        fetch: async () =>
          Response.json({ ticket: "test-ticket", expiresAt: 1 }),
      },
    });

    const client = new GatewayClient();
    const joined = vi.fn();
    client.on("join", joined);

    try {
      client.connect();
      await vi.waitFor(() =>
        expect(GatewayWebSocket.instances).toHaveLength(1),
      );
      const socket = GatewayWebSocket.instances[0];

      if (!socket) throw new Error("WebSocket was not created");
      expect(socket.protocols).toContain("lootlog.realtime.json.v1");
      socket.readyState = 1;
      socket.dispatchEvent(new Event("open"));
      client.join();
      await vi.waitFor(() =>
        expect(joined).toHaveBeenCalledWith(
          expect.objectContaining({ guildIds: expect.any(Array) }),
        ),
      );
      expect(client.connected).toBe(true);
      client.disconnect();
      expect(client.connected).toBe(false);
    } finally {
      client.disconnect();
      restore();
    }
  },
);
