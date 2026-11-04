import { afterEach, expect, it, vi } from "vitest";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
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
    const request = decodeRealtimeFrame(data);

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
  GatewayWebSocket.instances = [];
});

it("joins and stays connected", async () => {
  vi.stubGlobal("WebSocket", GatewayWebSocket);
  const client = createGameRealtimeClient();

  try {
    client.connect();
    await vi.waitFor(() => expect(GatewayWebSocket.instances).toHaveLength(1));
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
});
