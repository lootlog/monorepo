import { encodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REALTIME_JSON_SUBPROTOCOL } from "@lootlog/client/realtime";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("web realtime handshake", () => {
  it("opens a JSON WebSocket directly without an HTTP credential request", async () => {
    vi.stubEnv("VITE_GATEWAY_URL", "https://gateway.example.test");
    vi.stubEnv("VITE_GATEWAY_SOCKET_PATH", "/ws");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const handshakes: Array<{ url: string; protocols?: string[] }> = [];
    vi.stubGlobal(
      "WebSocket",
      class extends EventTarget {
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
          protocols: [REALTIME_JSON_SUBPROTOCOL],
        },
      ]);
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      client.disconnect();
    }
  });
});

it("dispatches private volunteer frames to their listener", async () => {
  vi.stubEnv("VITE_GATEWAY_URL", "https://gateway.example.test");
  let dispatch: ((event: Event) => boolean) | undefined;
  vi.stubGlobal(
    "WebSocket",
    class extends EventTarget {
      readyState = 1;
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
  const received = vi.fn();

  try {
    client.on("notification.volunteer", received);
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
        data: encodeRealtimeFrame(frame),
      }),
    );
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(data));
  } finally {
    client.disconnect();
  }
});
