import { afterEach, expect, it, vi } from "vitest";
import { decodeFrame, encodeFrame } from "@/test/realtime-wire";
import { createGameRealtimeClient } from "./game-client-platform";

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
    const request = decodeFrame(data);

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
          data: encodeFrame(frame),
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
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        Response.json({ ticket: "test-ticket", expiresAt: Date.now() + 60000 }),
      ),
    );
    const client = createGameRealtimeClient();

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
  },
);
