import { encodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REALTIME_JSON_SUBPROTOCOL,
  REALTIME_SUBPROTOCOL,
} from "@lootlog/client/realtime";
import {
  REALTIME_FEED_CAPABILITY,
  REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY,
} from "@lootlog/protocol/realtime";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("web realtime handshake", () => {
  it.each(["json", "messagepack"])(
    "opens %s WebSocket directly without an HTTP credential request",
    async (encoding) => {
      vi.stubEnv("VITE_GATEWAY_URL", "https://gateway.example.test");
      vi.stubEnv("VITE_GATEWAY_SOCKET_PATH", "/ws");
      vi.stubEnv("VITE_GATEWAY_FRAME_ENCODING", encoding);
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const handshakes: Array<{ url: string; protocols?: string[] }> = [];
      vi.stubGlobal(
        "WebSocket",
        class extends EventTarget {
          binaryType = "blob";
          readyState = 0;
          constructor(url: string, protocols?: string[]) {
            super();
            handshakes.push({ url, protocols });
          }
          close() {
            this.readyState = 3;
          }
        },
      );
      const { socket: client } = await import("./gateway-client");

      try {
        client.connect();
        expect(handshakes).toEqual([
          {
            url: "wss://gateway.example.test/ws",
            protocols: [
              encoding === "json"
                ? REALTIME_JSON_SUBPROTOCOL
                : REALTIME_SUBPROTOCOL,
              REALTIME_FEED_CAPABILITY,
              REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY,
            ],
          },
        ]);
        expect(fetcher).not.toHaveBeenCalled();
      } finally {
        client.disconnect();
      }
    },
  );
});

it.each(["json", "messagepack"] as const)(
  "dispatches private %s volunteer frames to the legacy volunteer listener",
  async (encoding) => {
    vi.stubEnv("VITE_GATEWAY_FRAME_ENCODING", encoding);
    vi.stubEnv("VITE_GATEWAY_URL", "https://gateway.example.test");
    let dispatch: ((event: Event) => boolean) | undefined;
    vi.stubGlobal(
      "WebSocket",
      class extends EventTarget {
        readyState = 1;
        binaryType = "arraybuffer";
        constructor() {
          super();
          dispatch = (event) => this.dispatchEvent(event);
        }
        close() {
          this.readyState = 3;
        }
        send() {}
      },
    );
    const { socket: client } = await import("./gateway-client");
    const { GatewayEvent } = await import("@/config/gateway");
    const received = vi.fn();

    try {
      client.on(GatewayEvent.NOTIFICATIONS_VOLUNTEER, received);
      client.connect();
      dispatch?.(new Event("open"));

      const data = {
        notificationId: "notification",
        volunteer: {
          discordId: "volunteer",
          world: "tempest",
          nick: "Volunteer",
          lvl: 250,
        },
      };

      const frame = { v: 1, type: "notification.volunteer", data } as const;
      dispatch?.(
        new MessageEvent("message", {
          data:
            encoding === "json"
              ? JSON.stringify(frame)
              : encodeRealtimeFrame(frame),
        }),
      );
      await vi.waitFor(() => expect(received).toHaveBeenCalledWith(data));
    } finally {
      client.disconnect();
    }
  },
);
